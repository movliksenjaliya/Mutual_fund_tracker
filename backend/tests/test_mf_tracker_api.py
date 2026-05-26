"""Backend API tests for MF Tracker"""
import os
import math
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://5ae6a5f9-c6ac-4616-8848-9b19719bedfe.preview.emergentagent.com"
API = BASE_URL.rstrip("/") + "/api"

NIFTY_CODE = "120716"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Nifty dashboard ----------
class TestDashboard:
    def test_nifty(self, s):
        r = s.get(f"{API}/dashboard/nifty", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "summary" in data and "history" in data
        assert data["summary"]["scheme_code"] == NIFTY_CODE
        assert isinstance(data["summary"]["curr_nav"], (int, float))
        assert isinstance(data["history"], list) and len(data["history"]) > 1

    def test_best_buys(self, s):
        r = s.get(f"{API}/dashboard/best-buys", timeout=60)
        assert r.status_code == 200
        items = r.json().get("items", [])
        # All returned items should have nav.change_pct < 0 and be sorted ascending
        prev = -math.inf
        for it in items:
            assert it["nav"]["change_pct"] < 0
            assert it["nav"]["change_pct"] >= prev
            prev = it["nav"]["change_pct"]


# ---------- Funds ----------
class TestFunds:
    def test_search(self, s):
        r = s.get(f"{API}/funds/search", params={"q": "nifty"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "results" in data and len(data["results"]) > 0
        assert "schemeCode" in data["results"][0]
        assert "schemeName" in data["results"][0]

    def test_search_min_length(self, s):
        r = s.get(f"{API}/funds/search", params={"q": "a"}, timeout=15)
        assert r.status_code == 422  # query min_length=2

    def test_fund_detail(self, s):
        r = s.get(f"{API}/funds/{NIFTY_CODE}", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["summary"]["scheme_code"] == NIFTY_CODE
        # Capped to 90 entries
        assert len(data["history"]) <= 90
        assert len(data["history"]) > 1

    def test_fund_detail_invalid(self, s):
        r = s.get(f"{API}/funds/9999999", timeout=30)
        assert r.status_code in (404, 502)


# ---------- Watchlist CRUD ----------
class TestWatchlist:
    def test_crud_flow(self, s):
        # Clean any leftover with same scheme_code first
        existing = s.get(f"{API}/watchlist", timeout=60).json().get("items", [])
        for it in existing:
            if it["scheme_code"] == NIFTY_CODE:
                s.delete(f"{API}/watchlist/{it['id']}", timeout=15)

        # Create
        payload = {"scheme_code": NIFTY_CODE, "scheme_name": "TEST_Nifty 50"}
        r = s.post(f"{API}/watchlist", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["scheme_code"] == NIFTY_CODE
        assert "id" in item
        item_id = item["id"]

        # Duplicate
        r2 = s.post(f"{API}/watchlist", json=payload, timeout=20)
        assert r2.status_code == 400

        # List
        r3 = s.get(f"{API}/watchlist", timeout=60).json()
        ids = [i["id"] for i in r3["items"]]
        assert item_id in ids

        # Patch target
        r4 = s.patch(f"{API}/watchlist/{item_id}", json={"target_buy_price": 100.5}, timeout=15)
        assert r4.status_code == 200
        assert r4.json()["target_buy_price"] == 100.5

        # Delete
        r5 = s.delete(f"{API}/watchlist/{item_id}", timeout=15)
        assert r5.status_code == 200
        assert r5.json().get("ok") is True

        # Patch on missing
        r6 = s.patch(f"{API}/watchlist/{item_id}", json={"target_buy_price": 1}, timeout=15)
        assert r6.status_code == 404


# ---------- Portfolio CRUD ----------
class TestPortfolio:
    def test_crud_and_calcs(self, s):
        # Clean
        existing = s.get(f"{API}/portfolio", timeout=60).json().get("items", [])
        for it in existing:
            if it["scheme_code"] == NIFTY_CODE:
                s.delete(f"{API}/portfolio/{it['id']}", timeout=15)

        payload = {
            "scheme_code": NIFTY_CODE,
            "scheme_name": "TEST_Nifty 50",
            "units": 10.0,
            "avg_buy_price": 100.0,
        }
        r = s.post(f"{API}/portfolio", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        h = r.json()
        hid = h["id"]

        # GET verify calculations
        listr = s.get(f"{API}/portfolio", timeout=60).json()
        target = next(i for i in listr["items"] if i["id"] == hid)
        assert target["invested"] == 1000.0
        assert target["nav"]["curr_nav"] > 0
        expected_current = round(10.0 * target["nav"]["curr_nav"], 2)
        assert abs(target["current_value"] - expected_current) < 0.05
        # pnl matches
        assert abs(target["pnl"] - round(target["current_value"] - 1000.0, 2)) < 0.05
        # summary contains numbers
        assert "total_invested" in listr["summary"]

        # PATCH
        r2 = s.patch(f"{API}/portfolio/{hid}", json={"units": 5.0}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["units"] == 5.0

        # DELETE
        r3 = s.delete(f"{API}/portfolio/{hid}", timeout=15)
        assert r3.status_code == 200

        # GET verifies deletion (404 on patch)
        r4 = s.patch(f"{API}/portfolio/{hid}", json={"units": 1.0}, timeout=15)
        assert r4.status_code == 404


# ---------- Alerts ----------
class TestAlerts:
    def test_check_and_list(self, s):
        r = s.post(f"{API}/alerts/check", timeout=120)
        assert r.status_code == 200
        assert "created" in r.json()
        r2 = s.get(f"{API}/alerts", timeout=20)
        assert r2.status_code == 200
        data = r2.json()
        assert "items" in data and "unread_count" in data

    def test_mark_all_and_delete(self, s):
        # mark all read
        r = s.post(f"{API}/alerts/mark-all-read", timeout=15)
        assert r.status_code == 200

        # Patch missing returns 404
        r2 = s.patch(f"{API}/alerts/nonexistent-id/read", timeout=15)
        assert r2.status_code == 404

        # Delete on missing returns 200 (current impl). Accept either.
        r3 = s.delete(f"{API}/alerts/nonexistent-id", timeout=15)
        assert r3.status_code in (200, 404)


# ---------- Settings ----------
class TestSettings:
    def test_get_and_update(self, s):
        r = s.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200
        original = r.json()["drop_threshold_pct"]

        r2 = s.patch(f"{API}/settings", json={"drop_threshold_pct": 2.5}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["drop_threshold_pct"] == 2.5

        r3 = s.get(f"{API}/settings", timeout=15)
        assert r3.json()["drop_threshold_pct"] == 2.5

        # restore
        s.patch(f"{API}/settings", json={"drop_threshold_pct": original}, timeout=15)


# ---------- Calculators ----------
class TestCalculators:
    def test_sip(self, s):
        body = {"monthly_amount": 10000, "years": 10, "expected_return_pct": 12}
        r = s.post(f"{API}/calc/sip", json=body, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Standard SIP formula future value ~ 23.23 lakhs
        assert d["invested"] == 1200000.0
        # ~2323391
        assert 2300000 < d["future_value"] < 2400000
        assert abs(d["gain"] - (d["future_value"] - d["invested"])) < 1.0

    def test_sip_zero_rate(self, s):
        body = {"monthly_amount": 1000, "years": 1, "expected_return_pct": 0}
        r = s.post(f"{API}/calc/sip", json=body, timeout=15)
        d = r.json()
        assert d["future_value"] == 12000.0
        assert d["gain"] == 0.0

    def test_lumpsum(self, s):
        body = {"amount": 100000, "years": 10, "expected_return_pct": 12}
        r = s.post(f"{API}/calc/lumpsum", json=body, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # 100000 * (1.12)^10 = 310585
        assert 310000 < d["future_value"] < 311000
        assert abs(d["gain"] - (d["future_value"] - d["invested"])) < 0.5
