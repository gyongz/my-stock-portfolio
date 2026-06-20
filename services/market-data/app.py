from __future__ import annotations

import math
import os
import socket
import threading
import time
from datetime import date, datetime, timedelta
from typing import Any, Literal, Optional

import akshare as ak
import baostock as bs
import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException, Query


Provider = Literal["akshare", "baostock"]
app = FastAPI(title="Portfolio Market Data Bridge", version="1.0.0")

_bao_lock = threading.Lock()
_cache_lock = threading.Lock()
_cache: dict[str, tuple[float, Any]] = {}


def require_token(authorization: Optional[str] = Header(default=None)) -> None:
    expected = os.getenv("MARKET_DATA_SERVICE_TOKEN", "").strip()
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Invalid market data service token")


def cached(key: str, ttl_seconds: int, loader):
    now = time.time()
    with _cache_lock:
        item = _cache.get(key)
        if item and now - item[0] < ttl_seconds:
            return item[1]
    value = loader()
    with _cache_lock:
        _cache[key] = (now, value)
    return value


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else default
    except (TypeError, ValueError):
        return default


def timestamp_ms(value: Any) -> int:
    text = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y%m%d%H%M%S%f"):
        try:
            return int(datetime.strptime(text, fmt).timestamp() * 1000)
        except ValueError:
            continue
    raise ValueError(f"Unsupported date value: {text}")


def normalize_code(code: str) -> str:
    return code.lower().replace("sh.", "").replace("sz.", "").replace("bj.", "").replace("sh", "").replace("sz", "")


def baostock_code(code: str) -> str:
    clean = normalize_code(code)
    return f"sh.{clean}" if clean.startswith(("5", "6", "9")) else f"sz.{clean}"


def is_etf_code(code: str) -> bool:
    clean = normalize_code(code)
    return clean.startswith("5") or clean.startswith("159")


def dataframe_records(frame) -> list[dict[str, Any]]:
    return frame.where(frame.notna(), None).to_dict(orient="records")


def akshare_spot_records() -> list[dict[str, Any]]:
    def load():
        # 新浪接口请求较多但稳定；东方财富全市场接口在部分网络会主动断开连接。
        records = dataframe_records(ak.stock_zh_a_spot())
        try:
            records.extend(dataframe_records(ak.fund_etf_category_sina(symbol="ETF基金")))
        except Exception:
            pass
        return records

    return cached("akshare:spot", 60, load)


def akshare_sina_daily(code: str, period: str):
    clean = normalize_code(code)
    symbol = baostock_code(clean).replace(".", "")
    if is_etf_code(clean):
        frame = ak.fund_etf_hist_sina(symbol=symbol)
    else:
        frame = ak.stock_zh_a_daily(
            symbol=symbol,
            start_date=(date.today() - timedelta(days=3650)).strftime("%Y%m%d"),
            end_date=date.today().strftime("%Y%m%d"),
            adjust="qfq",
        )
    if period in {"week", "month"} and not frame.empty:
        rule = "W-FRI" if period == "week" else "ME"
        frame = (
            frame.assign(date=pd.to_datetime(frame["date"]))
            .set_index("date")
            .resample(rule)
            .agg({"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"})
            .dropna(subset=["close"])
            .reset_index()
        )
    return frame.rename(columns={"date": "日期", "open": "开盘", "high": "最高", "low": "最低", "close": "收盘", "volume": "成交量"})


def akshare_kline(code: str, period: str, limit: int) -> list[dict[str, Any]]:
    clean = normalize_code(code)
    if period in {"day", "week", "month"}:
        period_map = {"day": "daily", "week": "weekly", "month": "monthly"}
        loader = ak.fund_etf_hist_em if is_etf_code(clean) else ak.stock_zh_a_hist
        try:
            frame = loader(symbol=clean, period=period_map[period], start_date=(date.today() - timedelta(days=3650)).strftime("%Y%m%d"), end_date=date.today().strftime("%Y%m%d"), adjust="qfq")
        except Exception:
            frame = akshare_sina_daily(clean, period)
        time_column = "日期"
    else:
        minute = period.replace("min", "")
        if minute not in {"1", "5", "15", "30", "60"}:
            raise ValueError(f"AKShare does not support period {period}")
        loader = ak.fund_etf_hist_min_em if is_etf_code(clean) else ak.stock_zh_a_hist_min_em
        frame = loader(
            symbol=clean,
            period=minute,
            start_date=(datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S"),
            end_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            adjust="qfq",
        )
        time_column = "时间"
    result = [
        {
            "timestamp": timestamp_ms(row[time_column]),
            "open": safe_float(row.get("开盘")),
            "high": safe_float(row.get("最高")),
            "low": safe_float(row.get("最低")),
            "close": safe_float(row.get("收盘")),
            "volume": safe_float(row.get("成交量")),
        }
        for row in dataframe_records(frame)
    ]
    return [item for item in result if item["close"] > 0][-limit:]


def akshare_quotes(codes: list[str]) -> dict[str, dict[str, float]]:
    wanted = {normalize_code(code) for code in codes}
    results: dict[str, dict[str, float]] = {}
    for row in akshare_spot_records():
        code = normalize_code(str(row.get("代码", "")))[-6:]
        if code not in wanted:
            continue
        price = safe_float(row.get("最新价"))
        yesterday = safe_float(row.get("昨收"), price)
        change = safe_float(row.get("涨跌额"), price - yesterday)
        percent = safe_float(row.get("涨跌幅"), (change / yesterday * 100) if yesterday else 0)
        results[code] = {
            "price": price,
            "change": change,
            "changePercent": percent,
            "open": safe_float(row.get("今开"), price),
            "high": safe_float(row.get("最高"), price),
            "low": safe_float(row.get("最低"), price),
            "volume": safe_float(row.get("成交量")),
            "yesterdayClose": yesterday,
        }
    return results


def akshare_stocks() -> list[dict[str, Any]]:
    seen: set[str] = set()
    results: list[dict[str, Any]] = []
    for row in akshare_spot_records():
        code = normalize_code(str(row.get("代码", "")))[-6:]
        name = str(row.get("名称", "")).strip()
        if len(code) != 6 or not name or code in seen:
            continue
        seen.add(code)
        results.append({
            "code": code,
            "name": name,
            "open": safe_float(row.get("今开")),
            "yesterdayClose": safe_float(row.get("昨收")),
        })
    return sorted(results, key=lambda item: item["code"])


class BaoSession:
    def __enter__(self):
        _bao_lock.acquire()
        previous_timeout = socket.getdefaulttimeout()
        socket.setdefaulttimeout(15)
        try:
            result = bs.login()
        except Exception:
            _bao_lock.release()
            raise
        finally:
            socket.setdefaulttimeout(previous_timeout)
        if result.error_code != "0":
            _bao_lock.release()
            raise RuntimeError(f"BaoStock login failed: {result.error_msg}")
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            bs.logout()
        finally:
            _bao_lock.release()


def bao_rows(result) -> list[dict[str, str]]:
    if result.error_code != "0":
        raise RuntimeError(result.error_msg)
    rows: list[dict[str, str]] = []
    while result.next():
        rows.append(dict(zip(result.fields, result.get_row_data())))
    return rows


def baostock_kline_locked(code: str, period: str, limit: int, days_override: Optional[int] = None) -> list[dict[str, Any]]:
    frequency_map = {"day": "d", "week": "w", "month": "m", "5min": "5", "15min": "15", "30min": "30", "60min": "60"}
    frequency = frequency_map.get(period)
    if not frequency:
        raise ValueError(f"BaoStock does not support period {period}")
    is_daily = frequency in {"d", "w", "m"}
    fields = "date,code,open,high,low,close,preclose,volume,amount,adjustflag" if is_daily else "date,time,code,open,high,low,close,volume,amount,adjustflag"
    days = days_override if days_override is not None else (3650 if is_daily else 180)
    query = bs.query_history_k_data_plus(
        baostock_code(code),
        fields,
        start_date=(date.today() - timedelta(days=days)).isoformat(),
        end_date=date.today().isoformat(),
        frequency=frequency,
        adjustflag="2",
    )
    rows = bao_rows(query)
    result = [
        {
            "timestamp": timestamp_ms(row.get("time") or row["date"]),
            "open": safe_float(row.get("open")),
            "high": safe_float(row.get("high")),
            "low": safe_float(row.get("low")),
            "close": safe_float(row.get("close")),
            "volume": safe_float(row.get("volume")),
        }
        for row in rows
    ]
    return [item for item in result if item["close"] > 0][-limit:]


def baostock_kline(code: str, period: str, limit: int) -> list[dict[str, Any]]:
    with BaoSession():
        return baostock_kline_locked(code, period, limit)


def baostock_quotes(codes: list[str]) -> dict[str, dict[str, float]]:
    results: dict[str, dict[str, float]] = {}
    with BaoSession():
        for raw_code in codes:
            code = normalize_code(raw_code)
            bars = baostock_kline_locked(code, "day", 2, days_override=15)
            if not bars:
                continue
            latest = bars[-1]
            previous = bars[-2]["close"] if len(bars) > 1 else latest["close"]
            results[code] = {
                "price": latest["close"],
                "change": latest["close"] - previous,
                "changePercent": ((latest["close"] - previous) / previous * 100) if previous else 0,
                "open": latest["open"],
                "high": latest["high"],
                "low": latest["low"],
                "volume": latest["volume"],
                "yesterdayClose": previous,
            }
    return results


def baostock_stocks() -> list[dict[str, Any]]:
    def load():
        with BaoSession():
            rows = bao_rows(bs.query_stock_basic())
        results = []
        for row in rows:
            code = normalize_code(row.get("code", ""))
            name = row.get("code_name", "").strip()
            security_type = row.get("type", "")
            status = row.get("status", "1")
            if len(code) == 6 and name and security_type in {"1", "5"} and status == "1":
                results.append({"code": code, "name": name})
        return sorted(results, key=lambda item: item["code"])

    return cached("baostock:stocks", 6 * 3600, load)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "providers": ["akshare", "baostock"]}


@app.get("/kline", dependencies=[Depends(require_token)])
def kline(provider: Provider, code: str, period: str = "day", limit: int = Query(default=520, ge=1, le=1000)):
    try:
        data = akshare_kline(code, period, limit) if provider == "akshare" else baostock_kline(code, period, limit)
        if not data:
            raise RuntimeError("No K-line data returned")
        return {"success": True, "provider": provider, "delayed": provider == "baostock", "data": data}
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.get("/quotes", dependencies=[Depends(require_token)])
def quotes(provider: Provider, codes: str):
    code_list = [normalize_code(code) for code in codes.split(",") if code.strip()]
    try:
        data = akshare_quotes(code_list) if provider == "akshare" else baostock_quotes(code_list)
        return {"success": True, "provider": provider, "delayed": provider == "baostock", "data": data}
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.get("/stocks", dependencies=[Depends(require_token)])
def stocks(provider: Provider):
    try:
        data = akshare_stocks() if provider == "akshare" else baostock_stocks()
        return {"success": True, "provider": provider, "data": data}
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
