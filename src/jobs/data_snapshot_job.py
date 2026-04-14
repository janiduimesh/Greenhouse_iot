"""
APScheduler job: Snapshots MongoDB sensor data to a JSON file every hour.
The chatbot reads this file instead of hitting MongoDB on every chat message.
"""

import json
import logging
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

from utils.database import get_database

logger = logging.getLogger(__name__)

# Path for the output JSON file
DATA_DIR = Path(__file__).parent.parent / "data"
SNAPSHOT_FILE = DATA_DIR / "sensor_snapshot.json"


def _serialize(obj):
    """Convert MongoDB/datetime objects to JSON-serializable types."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, "__str__"):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


async def update_sensor_snapshot():
    """
    Query MongoDB and write a fresh sensor snapshot to disk.
    Called at startup and then every hour by APScheduler.
    """
    try:
        db = get_database()

        # ── 1. Latest sensor reading ──────────────────────────────────────────
        latest_doc = await db["latest_sensor_readings"].find_one(
            {"device_id": "greenhouse_node_1"},
            sort=[("timestamp", -1)],
        )

        latest_reading = None
        if latest_doc:
            latest_doc.pop("_id", None)
            latest_reading = latest_doc

        # ── 2. Recent alerts (last 24 h) ──────────────────────────────────────
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        alerts_cursor = db["alerts"].find(
            {"timestamp": {"$gte": cutoff}}
        ).sort("timestamp", -1).limit(50)
        alerts_raw = await alerts_cursor.to_list(length=50)

        alerts_last_24h = []
        for a in alerts_raw:
            a.pop("_id", None)
            alerts_last_24h.append(a)

        # ── 3. Alert summary ──────────────────────────────────────────────────
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff}}},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
        ]
        summary_raw = await db["alerts"].aggregate(pipeline).to_list(length=10)
        alert_summary = {"critical": 0, "warning": 0}
        for r in summary_raw:
            if r["_id"] in alert_summary:
                alert_summary[r["_id"]] = r["count"]

        # ── 4. Build snapshot ─────────────────────────────────────────────────
        snapshot = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "latest_reading": latest_reading,
            "alerts_last_24h": alerts_last_24h,
            "alert_summary": alert_summary,
        }

        # Ensure output directory exists
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, default=_serialize, indent=2)

        logger.info("✅ Sensor snapshot updated → %s", SNAPSHOT_FILE)

    except Exception as exc:
        logger.error("❌ Failed to update sensor snapshot: %s", exc, exc_info=True)
