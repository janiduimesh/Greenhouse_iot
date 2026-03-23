// Base URL of your backend
// export const BASE_URL = "192.168.43.164:8002";
export const BASE_URL = "http://192.168.43.164:8002"

// WebSocket URL for real-time sensor data
export const SENSOR_WS_URL = `ws://${BASE_URL}/api/v1/ws/sensor-data`;