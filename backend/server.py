from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

MFAPI_BASE = "https://api.mfapi.in/mf"
NIFTY_INDEX_SCHEME_CODE = "120716"  # UTI Nifty 50 Index Fund - Direct Plan - Growth
DEFAULT_THRESHOLD = 1.0

# ---------- Models ----------

class WatchlistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scheme_code: str
    scheme_name: str
    target_buy_price: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WatchlistCreate(BaseModel):
    scheme_code: str
    scheme_name: str
    target_buy_price: Optional[float] = None


class WatchlistUpdate(BaseModel):
    target_buy_price: Optional[float] = None


class PortfolioHolding(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scheme_code: str
    scheme_name: str
    units: float
    avg_buy_price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PortfolioCreate(BaseModel):
    scheme_code: str
    scheme_name: str
    units: float
    avg_buy_price: float


class PortfolioUpdate(BaseModel):
    units: Optional[float] = None
    avg_buy_price: Optional[float] = None


class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scheme_code: str
    scheme_name: str
    prev_nav: float
    curr_nav: float
    change_pct: float
    nav_date: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Settings(BaseModel):
    drop_threshold_pct: float = DEFAULT_THRESHOLD


class SettingsUpdate(BaseModel):
    drop_threshold_pct: float


# ---------- Helpers ----------

async def fetch_scheme(scheme_code: str) -> dict:
    """Fetch full scheme detail from mfapi.in (includes NAV history)."""
    async with httpx.AsyncClient(timeout=20.0) as hc:
        r = await hc.get(f"{MFAPI_BASE}/{scheme_code}")
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"mfapi error: {r.status_code}")
        data = r.json()
        if not data or not data.get("data"):
            raise HTTPException(status_code=404, detail="Scheme not found")
        return data


def parse_nav_summary(scheme_data: dict) -> dict:
    meta = scheme_data.get("meta", {})
    history = scheme_data.get("data", [])
    if not history:
        return {}
    latest = history[0]
    prev = history[1] if len(history) > 1 else history[0]
    curr_nav = float(latest["nav"])
    prev_nav = float(prev["nav"])
    change_abs = curr_nav - prev_nav
    change_pct = (change_abs / prev_nav) * 100 if prev_nav else 0.0
    return {
        "scheme_code": str(meta.get("scheme_code", "")),
        "scheme_name": meta.get("scheme_name", ""),
        "fund_house": meta.get("fund_house", ""),
        "scheme_category": meta.get("scheme_category", ""),
        "scheme_type": meta.get("scheme_type", ""),
        "curr_nav": curr_nav,
        "prev_nav": prev_nav,
        "change_abs": round(change_abs, 4),
        "change_pct": round(change_pct, 4),
        "nav_date": latest["date"],
        "prev_date": prev["date"],
    }


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"_id": "global"}, {"_id": 0})
    if not doc:
        doc = {"drop_threshold_pct": DEFAULT_THRESHOLD}
        await db.settings.insert_one({"_id": "global", **doc})
    return doc


# ---------- Endpoints ----------

@api_router.get("/")
async def root():
    return {"message": "Mutual Fund Tracker API"}


# ----- Fund search & details -----

@api_router.get("/funds/search")
async def search_funds(q: str = Query(..., min_length=2)):
    async with httpx.AsyncClient(timeout=20.0) as hc:
        r = await hc.get(f"{MFAPI_BASE}/search", params={"q": q})
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="mfapi search failed")
        data = r.json()
        # Limit to top 30
        return {"results": data[:30]}


@api_router.get("/funds/{scheme_code}")
async def get_fund_detail(scheme_code: str):
    data = await fetch_scheme(scheme_code)
    summary = parse_nav_summary(data)
    history = data.get("data", [])[:90]  # last 90 entries (~3 months)
    return {"summary": summary, "history": history}


@api_router.get("/funds/{scheme_code}/nav")
async def get_fund_nav(scheme_code: str):
    data = await fetch_scheme(scheme_code)
    return parse_nav_summary(data)


# ----- Nifty quick endpoint -----

@api_router.get("/dashboard/nifty")
async def get_nifty():
    data = await fetch_scheme(NIFTY_INDEX_SCHEME_CODE)
    summary = parse_nav_summary(data)
    history = data.get("data", [])[:30]
    return {"summary": summary, "history": history}


# ----- Watchlist -----

@api_router.get("/watchlist")
async def list_watchlist():
    items = await db.watchlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Enrich with current NAV
    out = []
    for item in items:
        try:
            data = await fetch_scheme(item["scheme_code"])
            nav = parse_nav_summary(data)
            out.append({**item, "nav": nav})
        except Exception as e:
            logger.warning(f"NAV fetch failed for {item['scheme_code']}: {e}")
            out.append({**item, "nav": None})
    return {"items": out}


@api_router.post("/watchlist", response_model=WatchlistItem)
async def add_watchlist(body: WatchlistCreate):
    existing = await db.watchlist.find_one({"scheme_code": body.scheme_code})
    if existing:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    item = WatchlistItem(**body.model_dump())
    await db.watchlist.insert_one(item.model_dump())
    return item


@api_router.patch("/watchlist/{item_id}")
async def update_watchlist(item_id: str, body: WatchlistUpdate):
    res = await db.watchlist.update_one(
        {"id": item_id},
        {"$set": {k: v for k, v in body.model_dump(exclude_unset=True).items()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.watchlist.find_one({"id": item_id}, {"_id": 0})
    return doc


@api_router.delete("/watchlist/{item_id}")
async def delete_watchlist(item_id: str):
    res = await db.watchlist.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ----- Portfolio -----

@api_router.get("/portfolio")
async def list_portfolio():
    items = await db.portfolio.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    enriched = []
    total_invested = 0.0
    total_current = 0.0
    for item in items:
        invested = item["units"] * item["avg_buy_price"]
        nav = None
        current_value = invested
        pnl = 0.0
        pnl_pct = 0.0
        try:
            data = await fetch_scheme(item["scheme_code"])
            nav = parse_nav_summary(data)
            current_value = item["units"] * nav["curr_nav"]
            pnl = current_value - invested
            pnl_pct = (pnl / invested) * 100 if invested else 0.0
        except Exception as e:
            logger.warning(f"Portfolio NAV failed {item['scheme_code']}: {e}")
        total_invested += invested
        total_current += current_value
        enriched.append({
            **item,
            "invested": round(invested, 2),
            "current_value": round(current_value, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 4),
            "nav": nav,
        })
    total_pnl = total_current - total_invested
    total_pnl_pct = (total_pnl / total_invested) * 100 if total_invested else 0.0
    return {
        "items": enriched,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_current": round(total_current, 2),
            "total_pnl": round(total_pnl, 2),
            "total_pnl_pct": round(total_pnl_pct, 4),
        },
    }


@api_router.post("/portfolio", response_model=PortfolioHolding)
async def add_portfolio(body: PortfolioCreate):
    item = PortfolioHolding(**body.model_dump())
    await db.portfolio.insert_one(item.model_dump())
    return item


@api_router.patch("/portfolio/{item_id}")
async def update_portfolio(item_id: str, body: PortfolioUpdate):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates")
    res = await db.portfolio.update_one({"id": item_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.portfolio.find_one({"id": item_id}, {"_id": 0})
    return doc


@api_router.delete("/portfolio/{item_id}")
async def delete_portfolio(item_id: str):
    res = await db.portfolio.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ----- Best buy opportunities -----

@api_router.get("/dashboard/best-buys")
async def best_buys():
    items = await db.watchlist.find({}, {"_id": 0}).to_list(500)
    results = []
    for item in items:
        try:
            data = await fetch_scheme(item["scheme_code"])
            nav = parse_nav_summary(data)
            results.append({**item, "nav": nav})
        except Exception:
            continue
    # Sort by most negative change_pct first
    results.sort(key=lambda x: x["nav"]["change_pct"] if x.get("nav") else 0)
    # Return only those that dropped (change_pct < 0) — top 5
    dips = [r for r in results if r.get("nav") and r["nav"]["change_pct"] < 0][:5]
    return {"items": dips}


# ----- Alerts -----

@api_router.get("/alerts")
async def list_alerts(unread_only: bool = False):
    q = {"read": False} if unread_only else {}
    items = await db.alerts.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    unread = await db.alerts.count_documents({"read": False})
    return {"items": items, "unread_count": unread}


@api_router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    res = await db.alerts.update_one({"id": alert_id}, {"$set": {"read": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api_router.post("/alerts/mark-all-read")
async def mark_all_read():
    await db.alerts.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    res = await db.alerts.delete_one({"id": alert_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api_router.post("/alerts/check")
async def run_alert_check():
    created = await check_drops()
    return {"created": created}


async def check_drops() -> int:
    """Check Nifty + watchlist + portfolio for >threshold day-over-day drops."""
    settings = await get_settings_doc()
    threshold = float(settings.get("drop_threshold_pct", DEFAULT_THRESHOLD))

    # Collect unique scheme codes
    codes = {NIFTY_INDEX_SCHEME_CODE: "Nifty 50 Index Fund"}
    async for w in db.watchlist.find({}, {"_id": 0, "scheme_code": 1, "scheme_name": 1}):
        codes[w["scheme_code"]] = w["scheme_name"]
    async for p in db.portfolio.find({}, {"_id": 0, "scheme_code": 1, "scheme_name": 1}):
        codes[p["scheme_code"]] = p["scheme_name"]

    created = 0
    for code, name in codes.items():
        try:
            data = await fetch_scheme(code)
            nav = parse_nav_summary(data)
            if nav["change_pct"] <= -threshold:
                # Dedup: do not create if alert already exists with same nav_date+code
                exists = await db.alerts.find_one({
                    "scheme_code": code,
                    "nav_date": nav["nav_date"],
                })
                if exists:
                    continue
                alert = Alert(
                    scheme_code=code,
                    scheme_name=nav.get("scheme_name") or name,
                    prev_nav=nav["prev_nav"],
                    curr_nav=nav["curr_nav"],
                    change_pct=nav["change_pct"],
                    nav_date=nav["nav_date"],
                )
                await db.alerts.insert_one(alert.model_dump())
                created += 1
        except Exception as e:
            logger.warning(f"Alert check failed for {code}: {e}")
    return created


# ----- Settings -----

@api_router.get("/settings")
async def get_settings():
    doc = await get_settings_doc()
    return doc


@api_router.patch("/settings")
async def update_settings(body: SettingsUpdate):
    await db.settings.update_one(
        {"_id": "global"},
        {"$set": {"drop_threshold_pct": body.drop_threshold_pct}},
        upsert=True,
    )
    return {"drop_threshold_pct": body.drop_threshold_pct}


# ----- Calculators -----

class SIPRequest(BaseModel):
    monthly_amount: float
    years: float
    expected_return_pct: float


@api_router.post("/calc/sip")
async def calc_sip(body: SIPRequest):
    n = body.years * 12
    r = body.expected_return_pct / 100 / 12
    if r == 0:
        future_value = body.monthly_amount * n
    else:
        future_value = body.monthly_amount * (((1 + r) ** n - 1) / r) * (1 + r)
    invested = body.monthly_amount * n
    gain = future_value - invested
    return {
        "invested": round(invested, 2),
        "future_value": round(future_value, 2),
        "gain": round(gain, 2),
    }


class LumpsumRequest(BaseModel):
    amount: float
    years: float
    expected_return_pct: float


@api_router.post("/calc/lumpsum")
async def calc_lumpsum(body: LumpsumRequest):
    fv = body.amount * ((1 + body.expected_return_pct / 100) ** body.years)
    gain = fv - body.amount
    return {
        "invested": round(body.amount, 2),
        "future_value": round(fv, 2),
        "gain": round(gain, 2),
    }


# ----- Background task -----

async def background_alert_loop():
    # Wait briefly for app to start
    await asyncio.sleep(15)
    while True:
        try:
            created = await check_drops()
            if created:
                logger.info(f"Background alert check created {created} alerts")
        except Exception as e:
            logger.warning(f"Background alert loop error: {e}")
        await asyncio.sleep(1800)  # 30 minutes


@app.on_event("startup")
async def on_startup():
    asyncio.create_task(background_alert_loop())


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
