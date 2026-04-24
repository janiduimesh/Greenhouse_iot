from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timezone, timedelta
import logging
from utils.database import get_database

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────────

ALERT_THRESHOLDS = {
    "temperature": {
        "critical_high": {"value": 35, "message": "Temperature critically high", "icon": "🌡️"},
        "warning_high":  {"value": 30, "message": "Temperature above safe range", "icon": "🌡️"},
        "warning_low":   {"value": 10, "message": "Temperature below safe range", "icon": "🌡️"},
    },
    "humidity": {
        "warning_high": {"value": 90, "message": "Humidity very high", "icon": "💧"},
        "warning_low":  {"value": 30, "message": "Humidity too low", "icon": "💧"},
    },
    "soil_moisture_percentage": {
        "critical_low": {"value": 15, "message": "Soil critically dry — irrigation needed", "icon": "🪴"},
        "warning_low":  {"value": 25, "message": "Soil moisture low", "icon": "🪴"},
    },
    "co2_value": {
        "critical_high": {"value": 1000, "message": "CO₂ critically high — open vents", "icon": "💨"},
        "warning_high":  {"value": 700,  "message": "CO₂ elevated", "icon": "💨"},
    },
    "light_value": {
        "warning_low": {"value": 200, "message": "Very low light detected", "icon": "💡"},
    },
}


def check_thresholds(sensor_data: dict) -> list:
    """
    Check sensor values against thresholds.
    Returns a list of alert dicts for any triggered thresholds.
    Uses a priority system: only the most severe alert per sensor is kept.
    """
    alerts = []
    now = datetime.now(timezone.utc)

    for sensor_key, levels in ALERT_THRESHOLDS.items():
        value = sensor_data.get(sensor_key)
        if value is None:
            continue

        value = float(value)
        triggered = None

        # Check critical first, then warning (highest severity wins)
        if "critical_high" in levels and value >= float(levels["critical_high"]["value"]):
            triggered = {"severity": "critical", **levels["critical_high"]}
        elif "warning_high" in levels and value >= float(levels["warning_high"]["value"]):
            triggered = {"severity": "warning", **levels["warning_high"]}
        elif "critical_low" in levels and value <= float(levels["critical_low"]["value"]):
            triggered = {"severity": "critical", **levels["critical_low"]}
        elif "warning_low" in levels and value <= float(levels["warning_low"]["value"]):
            triggered = {"severity": "warning", **levels["warning_low"]}

        if triggered:
            alerts.append({
                "sensor": sensor_key,
                "value": value,
                "severity": triggered["severity"],
                "message": triggered["message"],
                "icon": triggered["icon"],
                "device_id": sensor_data.get("device_id", "unknown"),
                "timestamp": now,
            })

    return alerts


async def store_alerts(alerts: list):
    """Store alerts in MongoDB, deduplicating within 5-minute windows per sensor."""
    if not alerts:
        return []

    db = get_database()
    collection = db["alerts"]
    stored = []

    for alert in alerts:
        # Avoid duplicate: skip if same sensor+device+severity was alerted within last 5 min
        recent = await collection.find_one({
            "device_id": alert["device_id"],
            "sensor": alert["sensor"],
            "severity": alert["severity"],
            "timestamp": {"$gte": alert["timestamp"] - timedelta(minutes=5)},
        })

        if recent:
            continue

        result = await collection.insert_one(alert)
        alert["id"] = str(result.inserted_id)
        stored.append(alert)
        logger.info(
            "Alert stored: [%s] %s — %s = %s (device: %s)",
            alert["severity"],
            alert["message"],
            alert["sensor"],
            alert["value"],
            alert["device_id"],
        )

    return stored


# ── API Endpoints ─────────────────────────────────────────────────────────────

@router.get("/alerts")
async def get_alerts(
    device_id: str = Query(default="greenhouse_node_1"),
    hours: int = Query(default=24, ge=1, le=168),
    severity: str = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    """Get alert history for a device."""
    db = get_database()
    collection = db["alerts"]

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    query = {
        "device_id": device_id,
        "timestamp": {"$gte": cutoff},
    }

    if severity in ("critical", "warning"):
        query["severity"] = severity

    cursor = collection.find(query).sort("timestamp", -1).limit(limit)
    alerts = await cursor.to_list(length=limit)

    return {
        "success": True,
        "count": len(alerts),
        "alerts": [
            {
                "id": str(a["_id"]),
                "sensor": a["sensor"],
                "value": a["value"],
                "severity": a["severity"],
                "message": a["message"],
                "icon": a.get("icon", "⚠"),
                "device_id": a["device_id"],
                "timestamp": a["timestamp"].isoformat(),
            }
            for a in alerts
        ],
    }


@router.get("/alerts/summary")
async def get_alert_summary(
    device_id: str = Query(default="greenhouse_node_1"),
):
    """Get count of alerts by severity in last 24h."""
    db = get_database()
    collection = db["alerts"]

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    pipeline = [
        {"$match": {"device_id": device_id, "timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
    ]

    results = await collection.aggregate(pipeline).to_list(length=10)

    summary = {"critical": 0, "warning": 0}
    for r in results:
        if r["_id"] in summary:
            summary[r["_id"]] = r["count"]

    return {
        "success": True,
        "device_id": device_id,
        "last_24h": summary,
        "total": summary["critical"] + summary["warning"],
    }
