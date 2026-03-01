// Mock data for dashboard. Replace with API calls when IoT server is ready.

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')

/** Current readings (single object) */
export function getCurrentReadings() {
  return {
    temperature: 28.5,
    humidity: 71,
    heatIndex: 31.4,
    heatIndexStatus: 'warning',
    soilMoisture: 35,
    pumpStatus: 'on',
    pumpDurationMinutes: 5,
    lightLevel: 450,
    photoperiodHours: 13,
    co2Level: 950,
    co2Status: 'critical',
  }
}

/** 24h data: temperature & humidity (line chart) */
export function getTemperatureHumidity24h() {
  const hours = []
  for (let i = -24; i <= 0; i += 2) {
    const d = new Date(now.getTime() + i * 60 * 60 * 1000)
    const h = d.getHours()
    const temp = 22 + 6 * Math.sin((h - 6) * (Math.PI / 12)) + (Math.random() - 0.5) * 2
    const hum = 65 + 15 * Math.sin((h - 12) * (Math.PI / 12)) + (Math.random() - 0.5) * 5
    hours.push({
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      label: h === 0 ? '12 AM' : h === 6 ? '6 AM' : h === 12 ? '12 PM' : '',
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.round(hum),
    })
  }
  return hours
}

/** 24h data: soil moisture (bar chart) */
export function getSoilMoisture24h() {
  const hours = []
  for (let i = -24; i <= 0; i += 2) {
    const d = new Date(now.getTime() + i * 60 * 60 * 1000)
    const h = d.getHours()
    const moisture = 25 + 25 * Math.sin((h - 14) * (Math.PI / 12)) + (Math.random() - 0.5) * 8
    hours.push({
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      label: h === 0 ? '12 AM' : h === 6 ? '6 AM' : h === 12 ? '12 PM' : '',
      moisture: Math.max(0, Math.min(100, Math.round(moisture))),
    })
  }
  return hours
}

/** 24h data: light intensity (area chart) */
export function getLight24h() {
  const hours = []
  for (let i = -24; i <= 0; i += 2) {
    const d = new Date(now.getTime() + i * 60 * 60 * 1000)
    const h = d.getHours()
    const night = h >= 20 || h < 5
    const lx = night ? 20 + Math.random() * 30 : 100 + 350 * Math.exp(-Math.pow((h - 12) / 4, 2)) + (Math.random() - 0.5) * 40
    hours.push({
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      label: h === 0 ? '12 AM' : h === 6 ? '6 AM' : h === 12 ? '12 PM' : '',
      light: Math.round(Math.max(0, lx)),
    })
  }
  return hours
}

/** 24h data: CO2 (line chart) */
export function getCo224h() {
  const hours = []
  for (let i = -24; i <= 0; i += 2) {
    const d = new Date(now.getTime() + i * 60 * 60 * 1000)
    const h = d.getHours()
    const co2 = 400 + 400 * Math.sin((h - 8) * (Math.PI / 12)) + (Math.random() - 0.5) * 100
    hours.push({
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      label: h === 0 ? '12 AM' : h === 6 ? '6 AM' : h === 12 ? '12 PM' : '',
      co2: Math.round(Math.max(350, co2)),
    })
  }
  return hours
}

/** Alerts list */
export function getAlerts() {
  return [
    { id: '1', message: 'High CO₂ level!', severity: 'critical', minutesAgo: 10 },
    { id: '2', message: 'Heat Index Warning', severity: 'warning', minutesAgo: 30 },
    { id: '3', message: 'Low Soil Moisture', severity: 'warning', minutesAgo: 60 },
  ]
}

/** Device status list */
export function getDevices() {
  return [
    { id: '1', name: 'Temp/Humidity Node', status: 'online' },
    { id: '2', name: 'Soil Moisture Node', status: 'online' },
    { id: '3', name: 'Light Sensor Node', status: 'online' },
    { id: '4', name: 'CO₂ Sensor Node', status: 'alert' },
  ]
}
