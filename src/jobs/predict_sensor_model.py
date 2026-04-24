import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.database import get_database

import joblib
import numpy as np
import pandas as pd



# =========================================================
# LOGGING
# =========================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# =========================================================
# CONFIG
# =========================================================
MODEL_DIR = Path(__file__).parent.parent / "model" / "greenhouse"
MODEL_PREFIX = "sensor_lag_model"

SENSOR_COLUMNS = [
    "temperature",
    "humidity",
    "soil_moisture_percentage",
    "light_value",
    "co2_value",
]

TARGET_SENSORS = [
    "temperature",
    "humidity",
    "soil_moisture_percentage",
    "light_value",
    "co2_value",
]

LAG_STEPS = [1, 2, 3, 6, 12, 24]
RESAMPLE_FREQ = "1h"
FORECAST_HOURS = 6



# =========================================================
# MODEL LOADING
# =========================================================
def find_latest_model_path(device_id: str, target_sensor: str) -> Path:
    pattern = f"{MODEL_PREFIX}_{device_id}_{target_sensor}_*.pkl"
    matches = sorted(MODEL_DIR.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)

    if not matches:
        raise FileNotFoundError(
            f"No model file found for device_id={device_id}, target_sensor={target_sensor}"
        )

    return matches[0]


def load_model_bundle(device_id: str, target_sensor: str) -> dict:
    model_path = find_latest_model_path(device_id, target_sensor)
    logger.info("[Model] Loading %s", model_path.name)
    return joblib.load(model_path)


# =========================================================
# DATA FETCH
# =========================================================
async def fetch_recent_data(device_id: str, lookback_hours: int = 48) -> List[dict]:
    """
    Fetch enough recent history to build lag features up to 24 hours
    and rolling features safely.
    """
    
    # db = get_database()
    db = get_database()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    cursor = db["latest_sensor_readings"].find(
        {
            "device_id": device_id,
            "timestamp": {"$gte": cutoff}
        }
    ).sort("timestamp", 1)

    data = await cursor.to_list(length=None)
    logger.info("[Data] Fetched %s recent rows for device=%s", len(data), device_id)
    return data


# =========================================================
# PREPROCESSING
# =========================================================
def validate_required_columns(df: pd.DataFrame) -> None:
    required_cols = ["timestamp"] + SENSOR_COLUMNS
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")


def prepare_base_dataframe(data: List[dict]) -> pd.DataFrame:
    if not data:
        raise ValueError("No recent data available for prediction")

    df = pd.DataFrame(data)
    validate_required_columns(df)

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df = df.sort_values("timestamp").drop_duplicates(subset=["timestamp"])
    df = df.set_index("timestamp")

    df = df[SENSOR_COLUMNS].astype(float)

    # Hourly resampling
    df = df.resample(RESAMPLE_FREQ).mean()
    df = df.interpolate(method="time").ffill().bfill()

    return df


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["hour"] = df.index.hour
    df["dow"] = df.index.dayofweek
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    return df


def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col in SENSOR_COLUMNS:
        for lag in LAG_STEPS:
            df[f"{col}_lag_{lag}"] = df[col].shift(lag)

    return df


def add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    sensors = {
        "temperature": "temperature",
        "humidity": "humidity",
        "soil": "soil_moisture_percentage",
        "light": "light_value",
        "co2": "co2_value",
    }

    windows = [3, 6, 12]

    for short_name, col in sensors.items():
        for w in windows:
            df[f"{short_name}_roll_mean_{w}"] = (
                df[col].rolling(w, min_periods=1).mean().shift(1)
            )

        df[f"{short_name}_roll_std_6"] = (
            df[col].rolling(6, min_periods=2).std().shift(1)
        )

    return df


def get_feature_columns() -> List[str]:
    features = []

    for col in SENSOR_COLUMNS:
        for lag in LAG_STEPS:
            features.append(f"{col}_lag_{lag}")

    rolling_prefixes = ["temperature", "humidity", "soil", "light", "co2"]

    for prefix in rolling_prefixes:
        features.append(f"{prefix}_roll_mean_3")
        features.append(f"{prefix}_roll_mean_6")
        features.append(f"{prefix}_roll_mean_12")
        features.append(f"{prefix}_roll_std_6")

    features += [
        "hour_sin",
        "hour_cos",
        "dow",
    ]

    return features


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = add_time_features(df)
    df = add_lag_features(df)
    df = add_rolling_features(df)
    df = df.ffill().fillna(0)
    return df


# =========================================================
# POSTPROCESSING / SAFETY
# =========================================================
def clamp_prediction(sensor: str, value: float) -> float:
    if sensor == "temperature":
        return float(np.clip(value, 0, 60))
    if sensor == "humidity":
        return float(np.clip(value, 0, 100))
    if sensor == "soil_moisture_percentage":
        return float(np.clip(value, 0, 100))
    if sensor == "light_value":
        return float(np.clip(value, 0, 4095))
    if sensor == "co2_value":
        return float(np.clip(value, 0, 5000))
    return float(value)


# =========================================================
# RECURSIVE MULTI-STEP FORECAST
# =========================================================
def predict_next_6_hours_from_df(
    history_df: pd.DataFrame,
    model_bundles: Dict[str, dict],
) -> List[Dict]:
    """
    Recursive forecasting:
    - build next timestamp
    - compute features from current history
    - predict each target sensor for next hour
    - append predictions to history
    - repeat for 6 future hours
    """
    working_df = history_df.copy()
    forecasts = []

    for step in range(1, FORECAST_HOURS + 1):
        next_timestamp = working_df.index[-1] + pd.Timedelta(hours=1)

        # Create placeholder next row so time features can be computed for that hour
        next_row = pd.DataFrame(
            {
                "temperature": [np.nan],
                "humidity": [np.nan],
                "soil_moisture_percentage": [np.nan],
                "light_value": [np.nan],
                "co2_value": [np.nan],
            },
            index=[next_timestamp]
        )

        temp_df = pd.concat([working_df, next_row])
        feature_df = build_feature_frame(temp_df)

        row_features = feature_df.loc[[next_timestamp]]

        step_prediction = {
            "timestamp": next_timestamp.to_pydatetime()
        }

        # Predict each sensor for the next hour
        for sensor in TARGET_SENSORS:
            bundle = model_bundles[sensor]
            model = bundle["model"]
            feature_cols = bundle["feature_cols"]

            X = row_features[feature_cols]
            pred = float(model.predict(X)[0])
            pred = clamp_prediction(sensor, pred)

            # Optional rounding for clean output
            if sensor in ["temperature"]:
                pred = round(pred, 1)
            elif sensor in ["humidity", "soil_moisture_percentage", "light_value", "co2_value"]:
                pred = round(pred, 0)

            step_prediction[sensor] = pred

        forecasts.append(step_prediction)

        # Append predicted row to working history for recursive next step
        append_row = pd.DataFrame(
            {
                "temperature": [step_prediction["temperature"]],
                "humidity": [step_prediction["humidity"]],
                "soil_moisture_percentage": [step_prediction["soil_moisture_percentage"]],
                "light_value": [step_prediction["light_value"]],
                "co2_value": [step_prediction["co2_value"]],
            },
            index=[next_timestamp]
        )

        working_df = pd.concat([working_df, append_row])

    return forecasts


# =========================================================
# MAIN PUBLIC FUNCTION
# =========================================================
async def predict_sensor_forecast(device_id: str) -> Dict:
    recent_data = await fetch_recent_data(device_id=device_id, lookback_hours=72)

    if len(recent_data) == 0:
        raise ValueError(f"No recent data found for device_id={device_id}")

    history_df = prepare_base_dataframe(recent_data)

    # Need enough history for lag_24 and rolling windows
    if len(history_df) < 24:
        raise ValueError(
            f"Not enough hourly history for prediction. Need at least 24 rows, got {len(history_df)}"
        )

    model_bundles = {}
    for sensor in TARGET_SENSORS:
        model_bundles[sensor] = load_model_bundle(device_id=device_id, target_sensor=sensor)

    forecast = predict_next_6_hours_from_df(
        history_df=history_df,
        model_bundles=model_bundles,
    )

    return {
        "device_id": device_id,
        "generated_at": datetime.now(timezone.utc),
        "forecast_horizon_hours": FORECAST_HOURS,
        "forecast": forecast,
    }


# =========================================================
# OPTIONAL TEST ENTRYPOINT
# =========================================================
if __name__ == "__main__":
    import asyncio

    async def main():
        device_id = "greenhouse_node_1"
        result = await predict_sensor_forecast(device_id=device_id)

        print("\nForecast result:\n")
        for row in result["forecast"]:
            print({
                "timestamp": row["timestamp"].isoformat(),
                "temperature": row["temperature"],
                "humidity": row["humidity"],
                "soil_moisture_percentage": row["soil_moisture_percentage"],
                "light_value": row["light_value"],
                "co2_value": row["co2_value"],
            })

    asyncio.run(main())