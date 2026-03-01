import {
  getCurrentReadings,
  getTemperatureHumidity24h,
  getSoilMoisture24h,
  getLight24h,
  getCo224h,
  getAlerts,
  getDevices,
} from '../data/mockReadings'
import DashboardCard from '../components/DashboardCard'
import TemperatureHumidityChart from '../components/charts/TemperatureHumidityChart'
import SoilMoistureChart from '../components/charts/SoilMoistureChart'
import LightChart from '../components/charts/LightChart'
import Co2Chart from '../components/charts/Co2Chart'
import AlertList from '../components/AlertList'
import DeviceStatus from '../components/DeviceStatus'

const r = getCurrentReadings()
const tempHum24 = getTemperatureHumidity24h()
const soil24 = getSoilMoisture24h()
const light24 = getLight24h()
const co224 = getCo224h()
const alerts = getAlerts()
const devices = getDevices()

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white sr-only">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard title="Temperature & Humidity">
          <p className="text-2xl font-bold text-white">
            {r.temperature}°C <span className="text-slate-400 font-normal text-lg">/ {r.humidity}%</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-400 text-sm">Heat Index:</span>
            <span className="text-white font-medium">{r.heatIndex}°C</span>
            {r.heatIndexStatus === 'warning' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Warning
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-2">Temperature / Humidity (Last 24 Hours)</p>
          <TemperatureHumidityChart data={tempHum24} />
        </DashboardCard>

        <DashboardCard title="Soil Moisture & Irrigation">
          <p className="text-2xl font-bold text-white">{r.soilMoisture}%</p>
          <div className="mt-1">
            <span className="text-green-400 text-sm font-medium">
              Pump Status: {r.pumpStatus.toUpperCase()} ({r.pumpDurationMinutes}m)
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-2">Soil Moisture Level (Last 24 Hours)</p>
          <SoilMoistureChart data={soil24} />
        </DashboardCard>

        <DashboardCard title="Light Intensity">
          <p className="text-2xl font-bold text-white">{r.lightLevel} lx</p>
          <div className="mt-1">
            <span className="text-slate-400 text-sm">Photoperiod: </span>
            <span className="text-white">{r.photoperiodHours} hrs</span>
          </div>
          <p className="text-slate-500 text-xs mt-2">Light Intensity (Last 24 Hours)</p>
          <LightChart data={light24} />
        </DashboardCard>

        <DashboardCard title="CO₂ & Air Quality">
          <p className="text-2xl font-bold text-white">{r.co2Level} ppm</p>
          <div className="mt-1">
            {r.co2Status === 'critical' && (
              <span className="text-red-400 font-medium text-sm">High CO₂ Alert!</span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-2">CO₂ Level (Last 24 Hours)</p>
          <Co2Chart data={co224} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard
          title="Alerts"
          icon={<span className="text-red-500" aria-hidden><AlertPanelIcon /></span>}
        >
          <AlertList alerts={alerts} />
        </DashboardCard>
        <DashboardCard
          title="Device Status"
          icon={<span className="text-sky-500" aria-hidden><DevicePanelIcon /></span>}
        >
          <DeviceStatus devices={devices} />
        </DashboardCard>
      </div>
    </div>
  )
}

function AlertPanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function DevicePanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
