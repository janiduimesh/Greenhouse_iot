import json
import logging
from pathlib import Path

from groq import Groq
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
SNAPSHOT_FILE = DATA_DIR / "sensor_snapshot.json"
THRESHOLDS_FILE = DATA_DIR / "thresholds.json"

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = settings.groq_api_key
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set in .env")
        _client = Groq(api_key=api_key)
    return _client


def _load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.warning("Could not load %s: %s", path, exc)
        return {}


def _build_system_prompt(snapshot: dict, thresholds: dict) -> str:
    ts = snapshot.get("generated_at", "unknown")
    r  = snapshot.get("latest_reading") or {}

    def v(key, unit=""):
        val = r.get(key)
        return f"{val}{unit}" if val is not None else "N/A"

    def s(key):
        val = r.get(key)
        return str(val).upper() if val is not None else "?"

    sensors = (
        f"Temp:{v('temperature','°C')} Hum:{v('humidity','%')} "
        f"Soil:{v('soil_moisture_percentage','%')} CO2:{v('co2_value','ppm')} "
        f"Light:{v('light_value')}"
    )
    actuators = (
        f"Pump:{s('pump_status')} Fan:{s('fan_status')} "
        f"Servo:{s('servo_status')} Buzzer:{s('buzzer_status')}"
    )

    summary = snapshot.get("alert_summary", {})
    alert_line = (
        f"Alerts(24h): {summary.get('critical', 0)} critical "
        f"{summary.get('warning', 0)} warnings"
    )

    recent = snapshot.get("alerts_last_24h", [])[:3]
    alert_details = " | ".join(
        f"[{a.get('severity','?').upper()}] {a.get('sensor')}: {a.get('message')}"
        for a in recent
    ) if recent else "none"

    def thr(sensor, cfg):
        u = cfg.get("unit", "")
        parts = []
        for k in ("critical_high", "warning_high", "warning_low", "critical_low"):
            val = cfg.get(k)
            if val is not None:
                op  = ">" if "high" in k else "<"
                sev = "crit" if "critical" in k else "warn"
                parts.append(f"{sev}{op}{val}{u}")
        return f"{sensor}[{' '.join(parts)}]"

    thd_line = (
        " ".join(thr(s, c) for s, c in thresholds.items())
        if thresholds else "N/A"
    )

    return (
        "You are GreenBot, a friendly and intelligent assistant for a smart greenhouse system.\n"
        "You can have natural conversations AND answer questions about the greenhouse.\n\n"
        "GUIDELINES:\n"
        "- For greetings, general questions, or gardening advice → respond naturally and helpfully.\n"
        "- For questions about sensors, temperature, humidity, soil, CO2, light, alerts, or devices → "
        "use the greenhouse data below to give accurate answers.\n"
        "- Keep responses concise and friendly.\n"
        "- Never say 'I don't have access to data' — the data is provided below.\n\n"
        f"=== LIVE GREENHOUSE DATA (as of {ts}) ===\n"
        f"Sensors : {sensors}\n"
        f"Actuators: {actuators}\n"
        f"{alert_line} | Recent alerts: {alert_details}\n"
        f"Thresholds: {thd_line}\n"
        "=== END OF DATA ==="
    )


# ── Request schema ────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str


# ── Chat endpoint ─────────────────────────────────────────────────────────────
@router.post("/chat")
async def chat(body: ChatRequest):
    """Send a message to the greenhouse AI assistant (powered by Groq)."""
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        client = _get_client()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    snapshot   = _load_json(SNAPSHOT_FILE)
    thresholds = _load_json(THRESHOLDS_FILE)
    system_msg = _build_system_prompt(snapshot, thresholds)

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",   
            messages=[
                {"role": "system",  "content": system_msg},
                {"role": "user",    "content": body.message.strip()},
            ],
            max_tokens=512,
            temperature=0.4,
        )
        reply = completion.choices[0].message.content.strip()
        logger.info("✅ Groq response — tokens used: %s", completion.usage)
        return {"reply": reply}

    except Exception as exc:
        logger.error("Groq API error: %s", exc, exc_info=True)
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}")
