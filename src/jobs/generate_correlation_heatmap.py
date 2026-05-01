"""
Greenhouse IoT — Sensor Correlation Heatmap Generator
======================================================
Run this script standalone to generate a Pearson correlation heatmap
from real MongoDB sensor data.

Usage:
    cd Greenhouse_iot/src
    python jobs/generate_correlation_heatmap.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import seaborn as sns
from motor.motor_asyncio import AsyncIOMotorClient

# ── Config ────────────────────────────────────────────────────────────────────

SENSOR_COLUMNS = [
    "temperature",
    "humidity",
    "soil_moisture_percentage",
    "light_value",
    "co2_value",
]

SENSOR_LABELS = {
    "temperature": "Temperature (°C)",
    "humidity": "Humidity (%)",
    "soil_moisture_percentage": "Soil Moisture (%)",
    "light_value": "Light (raw)",
    "co2_value": "CO₂ (ppm)",
}

DATA_LOOKBACK_DAYS = 30
RESAMPLE_FREQ = "1h"
DEVICE_ID = "greenhouse_node_1"

OUTPUT_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH = OUTPUT_DIR / "correlation_heatmap.png"


# ── Data Fetching ─────────────────────────────────────────────────────────────

async def fetch_data():
    from utils.config import get_settings
    settings = get_settings()

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]

    cutoff = datetime.now(timezone.utc) - timedelta(days=DATA_LOOKBACK_DAYS)

    cursor = db["latest_sensor_readings"].find(
        {
            "device_id": DEVICE_ID,
            "timestamp": {"$gte": cutoff}
        }
    ).sort("timestamp", 1)

    data = await cursor.to_list(length=None)
    client.close()

    print(f"[Data] Fetched {len(data)} records for device={DEVICE_ID}")
    return data


# ── Preprocessing ─────────────────────────────────────────────────────────────

def preprocess(data):
    df = pd.DataFrame(data)

    if df.empty:
        raise ValueError("No data returned from MongoDB.")

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df = df.sort_values("timestamp").drop_duplicates(subset=["timestamp"])
    df = df.set_index("timestamp")

    # Keep only sensor columns that exist
    available = [c for c in SENSOR_COLUMNS if c in df.columns]
    df = df[available].astype(float)

    # Resample to hourly, interpolate gaps
    df = df.resample(RESAMPLE_FREQ).mean()
    df = df.interpolate(method="time").ffill().bfill()

    # Basic range cleaning
    if "humidity" in df.columns:
        df["humidity"] = df["humidity"].clip(0, 100)
    if "soil_moisture_percentage" in df.columns:
        df["soil_moisture_percentage"] = df["soil_moisture_percentage"].clip(0, 100)
    if "temperature" in df.columns:
        df["temperature"] = df["temperature"].clip(0, 60)
    if "co2_value" in df.columns:
        df["co2_value"] = df["co2_value"].clip(0, None)
    if "light_value" in df.columns:
        df["light_value"] = df["light_value"].clip(0, None)

    print(f"[Preprocess] {len(df)} hourly rows after cleaning")
    return df


# ── Heatmap Generation ────────────────────────────────────────────────────────

def generate_heatmap(df):
    # Rename columns to readable labels
    df_renamed = df.rename(columns=SENSOR_LABELS)

    corr = df_renamed.corr(method="pearson")

    print("\n[Correlation Matrix]")
    print(corr.round(3).to_string())

    # ── Plot ──────────────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(9, 7))

    fig.patch.set_facecolor("#0f172a")
    ax.set_facecolor("#0f172a")

    # Custom diverging colormap: blue → white → red
    cmap = sns.diverging_palette(220, 10, as_cmap=True)

    mask = np.zeros_like(corr, dtype=bool)  # show full matrix (no mask)

    sns.heatmap(
        corr,
        ax=ax,
        cmap=cmap,
        annot=True,
        fmt=".2f",
        linewidths=0.5,
        linecolor="#1e293b",
        vmin=-1,
        vmax=1,
        square=True,
        annot_kws={"size": 11, "weight": "bold", "color": "white"},
        cbar_kws={"shrink": 0.8},
    )

    # Style colorbar
    cbar = ax.collections[0].colorbar
    cbar.ax.yaxis.set_tick_params(color="white")
    plt.setp(cbar.ax.yaxis.get_ticklabels(), color="white", fontsize=9)
    cbar.set_label("Pearson r", color="white", fontsize=10)

    # Style axes
    ax.set_title(
        "Greenhouse Sensor Correlation Heatmap",
        color="white",
        fontsize=14,
        fontweight="bold",
        pad=16,
    )
    ax.tick_params(colors="white", labelsize=10)
    ax.set_xticklabels(ax.get_xticklabels(), rotation=25, ha="right", color="white")
    ax.set_yticklabels(ax.get_yticklabels(), rotation=0, color="white")

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()

    print(f"\n[Done] Heatmap saved → {OUTPUT_PATH}")
    return corr


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    print("=" * 60)
    print("Greenhouse Sensor Correlation Heatmap")
    print(f"Device : {DEVICE_ID}")
    print(f"Lookback: {DATA_LOOKBACK_DAYS} days")
    print("=" * 60)

    data = await fetch_data()
    df = preprocess(data)
    corr = generate_heatmap(df)

    # Print key findings
    print("\n[Key Correlation Pairs]")
    pairs = []
    cols = corr.columns.tolist()
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            pairs.append((cols[i], cols[j], corr.iloc[i, j]))

    pairs.sort(key=lambda x: abs(x[2]), reverse=True)
    for a, b, r in pairs:
        direction = "positive" if r > 0 else "negative"
        print(f"  {a} ↔ {b}: r = {r:.3f} ({direction})")


if __name__ == "__main__":
    asyncio.run(main())
