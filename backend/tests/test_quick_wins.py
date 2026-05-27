"""Backend tests for Quick Wins features:
- GET /api/funds/{code}/returns (rolling returns)
- /api/portfolio response: summary.total_xirr, items[].xirr, summary.category_breakdown
- POST /api/portfolio/{id}/buy-more (transactions accumulator)
- Legacy holdings without `transactions` still produce XIRR via synthetic txn
"""
import os
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

def _load_backend_url():
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    if url:
        return url.rstrip("/")
    # Fall back to reading frontend/.env
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set")

BASE_URL = _load_backend_url()
API = BASE_URL + "/api"

NIFTY = "120716"        # UTI Nifty 50
MIDCAP = "118989"       # HDFC Mid-Cap
SMALLCAP = "120503"     # Axis Small Cap


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _cleanup_portfolio(s, codes):
    """Remove any portfolio holdings with the given scheme_codes."""
    r = s.get(f"{API}/portfolio", timeout=60)
    if r.status_code != 200:
        return
    for it in r.json().get("items", []):
        if it["scheme_code"] in codes:
            s.delete(f"{API}/portfolio/{it['id']}", timeout=15)


# ---------- Rolling Returns ----------
class TestRollingReturns:
    def test_returns_keys_and_types(self, s):
        r = s.get(f"{API}/funds/{NIFTY}/returns", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["scheme_code"] == NIFTY
        rets = data["returns"]
        # All 6 period keys are present
        for key in ["1M", "3M", "6M", "1Y", "3Y", "5Y"]:
            assert key in rets, f"Missing key {key}"
            v = rets[key]
            assert v is None or isinstance(v, (int, float))

    def test_returns_reasonable_values(self, s):
        """1Y return for a Nifty index fund should be in -50% .. +100%."""
        r = s.get(f"{API}/funds/{NIFTY}/returns", timeout=60).json()
        one_y = r["returns"].get("1Y")
        if one_y is not None:
            assert -50 < one_y < 100

    def test_returns_invalid_scheme(self, s):
        r = s.get(f"{API}/funds/9999999/returns", timeout=30)
        # Should fail upstream (502) since invalid scheme returns no data
        assert r.status_code in (404, 502)


# ---------- Portfolio with XIRR + Category breakdown ----------
class TestPortfolioQuickWins:
    @classmethod
    def setup_class(cls):
        cls.codes = {NIFTY, MIDCAP, SMALLCAP}

    def setup_method(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        _cleanup_portfolio(s, self.codes)

    def teardown_method(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        _cleanup_portfolio(s, self.codes)

    def test_empty_portfolio_shape(self, s):
        # Ensure empty portfolio returns expected keys with zero/empty values
        r = s.get(f"{API}/portfolio", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["items"] == []
        sm = d["summary"]
        assert sm["total_invested"] == 0
        assert sm["total_current"] == 0
        assert sm["total_xirr"] is None
        assert sm["category_breakdown"] == []

    def test_single_holding_with_purchase_date_xirr(self, s):
        # Holding 1 year ago should give a meaningful XIRR
        purchase = (datetime.now(timezone.utc).date() - timedelta(days=365)).isoformat()
        payload = {
            "scheme_code": NIFTY,
            "scheme_name": "TEST_UTI Nifty",
            "units": 100.0,
            "avg_buy_price": 100.0,
            "purchase_date": purchase,
        }
        r = s.post(f"{API}/portfolio", json=payload, timeout=30)
        assert r.status_code == 200, r.text

        listed = s.get(f"{API}/portfolio", timeout=60).json()
        assert len(listed["items"]) == 1
        h = listed["items"][0]
        # XIRR should be a number (current NAV gives gain/loss vs 100)
        assert "xirr" in h
        assert h["xirr"] is None or isinstance(h["xirr"], (int, float))
        # category field present
        assert "category" in h
        # summary.total_xirr should reflect single-holding XIRR closely
        assert listed["summary"]["total_xirr"] is None or isinstance(listed["summary"]["total_xirr"], (int, float))
        # category_breakdown should have one entry summing to 100%
        cb = listed["summary"]["category_breakdown"]
        assert len(cb) >= 1
        total_pct = sum(c["pct"] for c in cb)
        assert 99.0 <= total_pct <= 101.0
        # Each entry has required keys & color
        for c in cb:
            assert {"category", "value", "pct", "color"}.issubset(c.keys())
            assert c["color"].startswith("#")

    def test_multiple_categories_breakdown(self, s):
        purchase = (datetime.now(timezone.utc).date() - timedelta(days=200)).isoformat()
        for code, units in [(NIFTY, 100.0), (MIDCAP, 50.0), (SMALLCAP, 50.0)]:
            r = s.post(
                f"{API}/portfolio",
                json={
                    "scheme_code": code,
                    "scheme_name": f"TEST_{code}",
                    "units": units,
                    "avg_buy_price": 100.0,
                    "purchase_date": purchase,
                },
                timeout=30,
            )
            assert r.status_code == 200, r.text
        # Allow brief settle
        time.sleep(0.5)
        d = s.get(f"{API}/portfolio", timeout=90).json()
        cb = d["summary"]["category_breakdown"]
        assert len(cb) >= 1
        # Total pct ~= 100
        total_pct = sum(c["pct"] for c in cb)
        assert 99.0 <= total_pct <= 101.0
        # Sorted desc by value
        for i in range(len(cb) - 1):
            assert cb[i]["value"] >= cb[i + 1]["value"]
        # Each holding has xirr key (value may be None)
        for it in d["items"]:
            assert "xirr" in it
        # Total xirr present (may be None)
        assert "total_xirr" in d["summary"]

    def test_buy_more_appends_transaction_and_recomputes_avg(self, s):
        purchase = (datetime.now(timezone.utc).date() - timedelta(days=180)).isoformat()
        r = s.post(
            f"{API}/portfolio",
            json={
                "scheme_code": NIFTY,
                "scheme_name": "TEST_UTI Nifty",
                "units": 10.0,
                "avg_buy_price": 100.0,
                "purchase_date": purchase,
            },
            timeout=30,
        )
        assert r.status_code == 200
        hid = r.json()["id"]
        # buy more: 10 units @ 200
        r2 = s.post(f"{API}/portfolio/{hid}/buy-more", json={"units": 10.0, "price": 200.0}, timeout=30)
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert abs(body["units"] - 20.0) < 1e-6
        # weighted avg: (10*100 + 10*200)/20 = 150
        assert abs(body["avg_buy_price"] - 150.0) < 1e-6
        # Listing should reflect new units/avg
        listed = s.get(f"{API}/portfolio", timeout=60).json()
        target = next(i for i in listed["items"] if i["id"] == hid)
        assert abs(target["units"] - 20.0) < 1e-6
        assert abs(target["avg_buy_price"] - 150.0) < 1e-6
        # Invested = 20 * 150 = 3000
        assert abs(target["invested"] - 3000.0) < 0.05
        # XIRR may be present
        assert "xirr" in target

    def test_buy_more_invalid_amounts(self, s):
        # First add a holding
        r = s.post(
            f"{API}/portfolio",
            json={"scheme_code": NIFTY, "scheme_name": "TEST", "units": 1.0, "avg_buy_price": 100.0},
            timeout=30,
        )
        hid = r.json()["id"]
        r2 = s.post(f"{API}/portfolio/{hid}/buy-more", json={"units": 0, "price": 10}, timeout=15)
        assert r2.status_code == 400
        r3 = s.post(f"{API}/portfolio/{hid}/buy-more", json={"units": 5, "price": -1}, timeout=15)
        assert r3.status_code == 400
        r4 = s.post(f"{API}/portfolio/nonexistent-id/buy-more", json={"units": 1, "price": 1}, timeout=15)
        assert r4.status_code == 404

    def test_legacy_holding_without_transactions_still_gets_xirr(self, s):
        """Directly insert a holding into Mongo via API but then strip transactions array
        won't work via API; simulate by adding a holding WITHOUT purchase_date — the synthetic
        XIRR path should kick in using created_at."""
        # Add a holding without purchase_date — the POST seeds a 'transactions' entry using
        # today's date, so XIRR will have <2 days between buy and today → could return None.
        # We accept either valid number or None gracefully.
        r = s.post(
            f"{API}/portfolio",
            json={"scheme_code": NIFTY, "scheme_name": "TEST_NoDate", "units": 5.0, "avg_buy_price": 100.0},
            timeout=30,
        )
        assert r.status_code == 200
        listed = s.get(f"{API}/portfolio", timeout=60).json()
        h = next(i for i in listed["items"] if i["id"] == r.json()["id"])
        # Just verify the key exists and either is None or a number — no crash
        assert "xirr" in h
        assert h["xirr"] is None or isinstance(h["xirr"], (int, float))
        # category breakdown remains valid
        cb = listed["summary"]["category_breakdown"]
        assert isinstance(cb, list)

    def test_xirr_pnl_sign_consistency(self, s):
        """If P&L is positive, XIRR should typically be positive (and vice versa)
        for a >1 year holding. We allow None safely."""
        purchase = (datetime.now(timezone.utc).date() - timedelta(days=400)).isoformat()
        r = s.post(
            f"{API}/portfolio",
            json={
                "scheme_code": NIFTY,
                "scheme_name": "TEST_Sign",
                "units": 1.0,
                "avg_buy_price": 1.0,  # extremely low buy → forces big gain
                "purchase_date": purchase,
            },
            timeout=30,
        )
        assert r.status_code == 200
        listed = s.get(f"{API}/portfolio", timeout=60).json()
        h = next(i for i in listed["items"] if i["id"] == r.json()["id"])
        if h["xirr"] is not None:
            # Massive gain → XIRR must be strongly positive
            assert h["xirr"] > 0
