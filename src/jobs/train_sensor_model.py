import asyncio
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import numpy as np
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit



LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "sensor_retraining.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


MODEL_DIR = Path(__file__).parent.parent / "model" / "greenhouse"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PREFIX = "sensor_lag_model"

DATA_LOOKBACK_DAYS = 30
RESAMPLE_FREQ = "1h"
FORECAST_STEPS = 6                 # 6 hours ahead
MIN_SAMPLES_FOR_TRAINING = 100

TARGET_SENSORS = [
    "temperature",
    "humidity",
    "soil_moisture_percentage",
    "light_value",
    "co2_value",
]

SENSOR_COLUMNS = [
    "temperature",
    "humidity",
    "soil_moisture_percentage",
    "light_value",
    "co2_value",
]

LAG_STEPS = [1, 2, 3, 6, 12, 24]



async def get_settings():
    """
    Adjust this import to match your project.
    Expected settings fields:
      - mongodb_url
      - mongodb_db_name
    """
    from utils.config import get_settings as _get_settings
    return _get_settings()



async def fetch_training_data(settings, device_id: str) -> List[dict]:
    """
    Fetch historical greenhouse data from MongoDB for one device.
    Assumes collection name: sensor_readings

    Required fields in each document:
      - timestamp
      - device_id
      - temperature
      - humidity
      - soil_moisture_percentage
      - light_value
      - co2_value
    """
    logger.info("[Data] Connecting to MongoDB for device=%s", device_id)

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=DATA_LOOKBACK_DAYS)

    cursor = db["latest_sensor_readings"].find(
        {
            "device_id": device_id,
            "timestamp": {"$gte": cutoff_date}
        }
    ).sort("timestamp", 1)

    data = await cursor.to_list(length=None)
    client.close()

    logger.info(
        "[Data] Fetched %s rows for device=%s from last %s days",
        len(data), device_id, DATA_LOOKBACK_DAYS
    )
    return data


# =========================================================
# PREPROCESSING
# =========================================================
def validate_required_columns(df: pd.DataFrame) -> None:
    required_cols = ["timestamp"] + SENSOR_COLUMNS
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")


def basic_cleaning(df: pd.DataFrame) -> pd.DataFrame:
    """
    Basic sanity cleaning.
    Adjust thresholds to your sensor calibration if needed.
    """
    if "humidity" in df.columns:
        df = df[(df["humidity"] >= 0) & (df["humidity"] <= 100)]

    if "soil_moisture_percentage" in df.columns:
        df = df[
            (df["soil_moisture_percentage"] >= 0) &
            (df["soil_moisture_percentage"] <= 100)
        ]

    if "temperature" in df.columns:
        df = df[(df["temperature"] > 0) & (df["temperature"] < 60)]

    if "co2_value" in df.columns:
        df = df[df["co2_value"] >= 0]

    if "light_value" in df.columns:
        df = df[df["light_value"] >= 0]

    return df


def prepare_base_dataframe(data: List[dict]) -> pd.DataFrame:
    """
    Convert raw MongoDB docs -> cleaned, hourly dataframe.
    """
    df = pd.DataFrame(data)

    if df.empty:
        raise ValueError("No data available for training")

    validate_required_columns(df)

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df = df.sort_values("timestamp").drop_duplicates(subset=["timestamp"])
    df = df.set_index("timestamp")

    df = df[SENSOR_COLUMNS].astype(float)

    # Resample to hourly data
    df = df.resample(RESAMPLE_FREQ).mean()

    # Fill gaps after resampling
    df = df.interpolate(method="time").ffill().bfill()

    # Basic sensor-range filtering
    df = basic_cleaning(df)

    # If filtering removed rows, restore regular hourly continuity
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


def add_target(df: pd.DataFrame, target_sensor: str) -> pd.DataFrame:
    df = df.copy()
    df[f"target_{target_sensor}_6h"] = df[target_sensor].shift(-FORECAST_STEPS)
    return df


def prepare_features(data: List[dict], target_sensor: str) -> pd.DataFrame:
    """
    Full feature engineering pipeline for one target sensor.
    """
    if target_sensor not in TARGET_SENSORS:
        raise ValueError(f"Unsupported target_sensor: {target_sensor}")

    df = prepare_base_dataframe(data)
    df = add_time_features(df)
    df = add_lag_features(df)
    df = add_rolling_features(df)
    df = add_target(df, target_sensor)

    target_col = f"target_{target_sensor}_6h"

    # Need enough lag history up to 24 hours
    must_have = [f"{target_sensor}_lag_24", target_col]
    df = df.dropna(subset=must_have)

    # Fill remaining NaN values from rolling std etc.
    df = df.ffill().fillna(0)

    if len(df) < MIN_SAMPLES_FOR_TRAINING:
        logger.warning(
            "[Features] Low sample count after feature prep for target=%s: %s rows",
            target_sensor, len(df)
        )

    return df


# =========================================================
# FEATURES
# =========================================================
from typing import List

def get_feature_columns() -> List[str]:
    features = []

    # Lag features for all sensors
    for col in SENSOR_COLUMNS:
        for lag in LAG_STEPS:
            features.append(f"{col}_lag_{lag}")

    # Rolling features for all sensors
    rolling_prefixes = ["temperature", "humidity", "soil", "light", "co2"]

    for prefix in rolling_prefixes:
        features.append(f"{prefix}_roll_mean_3")
        features.append(f"{prefix}_roll_mean_6")
        features.append(f"{prefix}_roll_mean_12")
        features.append(f"{prefix}_roll_std_6")

    # Time features
    features += [
        "hour_sin",
        "hour_cos",
        "dow",
    ]

    return features


# =========================================================
# TRAINING
# =========================================================
def calculate_metrics(y_true, y_pred) -> Dict[str, float]:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    return {
        "mae": float(mae),
        "rmse": float(rmse),
        "r2": float(r2),
    }


def train_model(df: pd.DataFrame, target_sensor: str) -> Tuple[RandomForestRegressor, List[str], Dict[str, float]]:
    logger.info("[Train] Training model for target=%s", target_sensor)

    target_col = f"target_{target_sensor}_6h"
    feature_cols = get_feature_columns()
    available_cols = [c for c in feature_cols if c in df.columns]

    X = df[available_cols]
    y = df[target_col]

    logger.info("[Train] Samples=%s, Features=%s", len(X), len(available_cols))

    if len(X) < MIN_SAMPLES_FOR_TRAINING:
        raise ValueError(
            f"Not enough samples to train target={target_sensor}. "
            f"Need at least {MIN_SAMPLES_FOR_TRAINING}, got {len(X)}"
        )

    # TimeSeriesSplit for time-series-safe validation
    n_splits = min(4, max(2, len(X) // 150))
    tscv = TimeSeriesSplit(n_splits=n_splits)

    fold_metrics = []

    model = RandomForestRegressor(
        n_estimators=400,
        max_depth=14,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X), start=1):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model.fit(X_train, y_train)
        y_pred = model.predict(X_val)

        metrics = calculate_metrics(y_val, y_pred)
        fold_metrics.append(metrics)

        logger.info(
            "[Train] target=%s fold=%s MAE=%.4f RMSE=%.4f R2=%.4f",
            target_sensor,
            fold,
            metrics["mae"],
            metrics["rmse"],
            metrics["r2"],
        )

    avg_metrics = {
        "mae": float(np.mean([m["mae"] for m in fold_metrics])),
        "rmse": float(np.mean([m["rmse"] for m in fold_metrics])),
        "r2": float(np.mean([m["r2"] for m in fold_metrics])),
    }

    logger.info(
        "[Train] target=%s CV average -> MAE=%.4f RMSE=%.4f R2=%.4f",
        target_sensor,
        avg_metrics["mae"],
        avg_metrics["rmse"],
        avg_metrics["r2"],
    )

    # Final fit on all available data
    model.fit(X, y)

    # Feature importance log
    importance_df = pd.DataFrame({
        "feature": available_cols,
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=False)

    logger.info("[Train] target=%s top 8 features:", target_sensor)
    for _, row in importance_df.head(8).iterrows():
        logger.info("    %s -> %.5f", row["feature"], row["importance"])

    return model, available_cols, avg_metrics


# =========================================================
# SAVE
# =========================================================
def save_model(
    model,
    feature_cols: List[str],
    metrics: Dict[str, float],
    samples_used: int,
    device_id: str,
    target_sensor: str,
) -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    model_path = MODEL_DIR / f"{MODEL_PREFIX}_{device_id}_{target_sensor}_{timestamp}.pkl"

    model_data = {
        "model": model,
        "feature_cols": feature_cols,
        "trained_at": datetime.now(timezone.utc),
        "samples_used": samples_used,
        "metrics": metrics,
        "version": "1.0.0",
        "device_id": device_id,
        "target_sensor": target_sensor,
        "target_column": f"target_{target_sensor}_6h",
        "resample_freq": RESAMPLE_FREQ,
        "forecast_steps": FORECAST_STEPS,
        "lag_steps": LAG_STEPS,
        "sensor_columns": SENSOR_COLUMNS,
    }

    joblib.dump(model_data, model_path)
    logger.info("[Save] Saved model -> %s", model_path)

    # Remove old model files for same device + target
    pattern = f"{MODEL_PREFIX}_{device_id}_{target_sensor}_*.pkl"
    for old_file in MODEL_DIR.glob(pattern):
        if old_file != model_path:
            try:
                old_file.unlink()
                logger.info("[Save] Removed old model -> %s", old_file.name)
            except OSError as e:
                logger.warning("[Save] Could not remove %s: %s", old_file.name, e)

    return model_path


# =========================================================
# TRAIN ONE TARGET
# =========================================================
async def train_one_target_for_device(settings, device_id: str, target_sensor: str) -> bool:
    try:
        data = await fetch_training_data(settings, device_id)

        if len(data) < MIN_SAMPLES_FOR_TRAINING:
            logger.warning(
                "[Skip] device=%s target=%s not enough raw rows: %s",
                device_id, target_sensor, len(data)
            )
            return False

        df = prepare_features(data, target_sensor)

        if len(df) < MIN_SAMPLES_FOR_TRAINING:
            logger.warning(
                "[Skip] device=%s target=%s not enough feature rows: %s",
                device_id, target_sensor, len(df)
            )
            return False

        model, feature_cols, metrics = train_model(df, target_sensor)

        save_model(
            model=model,
            feature_cols=feature_cols,
            metrics=metrics,
            samples_used=len(df),
            device_id=device_id,
            target_sensor=target_sensor,
        )

        logger.info(
            "[Done] device=%s target=%s trained successfully",
            device_id, target_sensor
        )
        return True

    except Exception as e:
        logger.error(
            "[Error] device=%s target=%s failed: %s",
            device_id, target_sensor, str(e), exc_info=True
        )
        return False


# =========================================================
# TRAIN ALL TARGETS FOR ONE DEVICE
# =========================================================
async def train_all_targets_for_device(settings, device_id: str) -> Dict[str, bool]:
    logger.info("=" * 70)
    logger.info("[Start] Training all sensor models for device=%s", device_id)
    logger.info("=" * 70)

    results = {}

    for target_sensor in TARGET_SENSORS:
        logger.info("-" * 60)
        logger.info("[Target] Training target=%s for device=%s", target_sensor, device_id)
        logger.info("-" * 60)

        success = await train_one_target_for_device(settings, device_id, target_sensor)
        results[target_sensor] = success

    success_count = sum(results.values())
    logger.info(
        "[Summary] device=%s -> trained %s/%s targets successfully",
        device_id, success_count, len(TARGET_SENSORS)
    )

    return results


# =========================================================
# MAIN
# =========================================================
async def main():
    """
    Adjust GREENHOUSE_DEVICE_IDS import to match your project.
    Example:
      GREENHOUSE_DEVICE_IDS = ["GH001", "GH002"]
    """
    GREENHOUSE_DEVICE_IDS = ["greenhouse_node_1"]
    start_time = datetime.now(timezone.utc)

    logger.info("=" * 80)
    logger.info("[Main] Starting greenhouse sensor model retraining")
    logger.info("Time: %s", start_time.isoformat())
    logger.info("Targets: %s", TARGET_SENSORS)
    logger.info("Lookback days: %s", DATA_LOOKBACK_DAYS)
    logger.info("Resample: %s", RESAMPLE_FREQ)
    logger.info("Forecast steps: %s", FORECAST_STEPS)
    logger.info("=" * 80)

    try:
        settings = await get_settings()

        overall_results = {}

        for device_id in GREENHOUSE_DEVICE_IDS:
            device_results = await train_all_targets_for_device(settings, device_id)
            overall_results[device_id] = device_results

        total_models = len(GREENHOUSE_DEVICE_IDS) * len(TARGET_SENSORS)
        success_models = sum(
            1
            for device_map in overall_results.values()
            for success in device_map.values()
            if success
        )

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()

        logger.info("=" * 80)
        logger.info("[Main] Retraining completed")
        logger.info("Successful models: %s/%s", success_models, total_models)
        logger.info("Duration: %.2f seconds", duration)
        logger.info("=" * 80)

    except Exception as e:
        logger.error("[Main] Retraining failed: %s", str(e), exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(main())