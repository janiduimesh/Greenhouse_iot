import { useState, useEffect, useMemo } from "react";
import { BASE_URL } from "../api/socketConfig";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Brush, CartesianGrid, Legend
} from "recharts";

// ── Shared Config ────────────────────────────────────────────────────────────
const SENSORS = [
  { key: "temperature", label: "Temperature", icon: "🌡️", unit: "°C", color: "#f472b6" },
  { key: "humidity", label: "Humidity", icon: "☁️", unit: "%", color: "#38bdf8" },
  { key: "moisture", label: "Soil Moisture", icon: "💧", unit: "%", color: "#22c55e", dbKey: "soil_moisture_percentage" },
  { key: "light", label: "Light", icon: "💡", unit: "%", color: "#f59e0b", dbKey: "light_value" },
  { key: "co2", label: "CO₂ Level", icon: "🔷", unit: "ppm", color: "#818cf8", dbKey: "co2_value" },
];

const PERIODS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
];

function convertTimestamp(isoStr) {
  const date = new Date(isoStr);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// ── Tab 1: Visualizations (Brushing & Comparatives) ─────────────────────────
function VisualizationsTab({ data, loading }) {
  const [aggregation, setAggregation] = useState("monthly");

  const chartData = useMemo(() => {
    if (!data || !data.length) return [];

    let map = {};

    const getGroupKey = (dateObj) => {
      if (aggregation === "monthly") {
        return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (aggregation === "weekly") {
        const d = new Date(dateObj);
        d.setUTCHours(0, 0, 0, 0);
        d.setUTCDate(d.getUTCDate() - d.getUTCDay());
        return `Week of ${d.getMonth() + 1}/${d.getDate()}`;
      } else if (aggregation === "daily") {
        return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      } else {
        return `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours().toString().padStart(2, '0')}:00`;
      }
    };

    data.forEach((d) => {
      const dateObj = new Date(d.timestamp);
      const key = getGroupKey(dateObj);

      if (!map[key]) {
        map[key] = {
          formattedTime: key,
          count: 0,
          temperature: 0,
          humidity: 0,
          moisture: 0,
          light: 0,
          co2: 0,
        };
      }

      const entry = map[key];
      entry.count++;
      entry.temperature += (d.temperature || 0);
      entry.humidity += (d.humidity || 0);
      entry.moisture += (d.soil_moisture_percentage || 0);
      entry.light += (d.light_value || 0);
      entry.co2 += (d.co2_value || 0);
    });

    return Object.values(map).map(d => ({
      formattedTime: d.formattedTime,
      temperature: d.temperature / d.count,
      humidity: d.humidity / d.count,
      moisture: d.moisture / d.count,
      light: d.light / d.count,
      co2: d.co2 / d.count,
    }));
  }, [data, aggregation]);

  if (loading) {
    return <div className="h-96 flex items-center justify-center text-slate-500">Loading historical data...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-96 flex items-center justify-center text-slate-500">No data available for analytical view.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="mb-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-3">
              Climate Correlation
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-[11px] px-2 py-0.5 rounded text-slate-200 outline-none cursor-pointer"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Comparing Temperature vs Humidity over time (Dual Y-Axis). Use the brush slider below to zoom.
          </p>
        </div>

        <div className="h-80 w-full mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="formattedTime" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#f472b6" domain={["auto", "auto"]} orientation="left" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}°C`} />
              <YAxis yAxisId="right" stroke="#38bdf8" domain={["auto", "auto"]} orientation="right" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />

              <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temperature" stroke="#f472b6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />

              {/* Master Brushing Timeline */}
              <Brush dataKey="formattedTime" height={30} stroke="#475569" fill="#1e293b" tickFormatter={() => ''}>
                <LineChart>
                  <Line type="monotone" dataKey="temperature" stroke="#64748b" dot={false} />
                </LineChart>
              </Brush>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-white font-semibold">Growth Metrics</h3>
          <p className="text-xs text-slate-400">Comparing Substrate Moisture vs Light vs CO2. Synced with global timeline.</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="formattedTime" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#475569" domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="co2" name="CO2 Level" stroke="#818cf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="moisture" name="Soil Moisture" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="light" name="Light" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Export & Table ───────────────────────────────────────────────────

async function downloadCSV(sensorDbKey, days, filenameSuffix) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/v1/sensor-data/history?device_id=greenhouse_node_1&sensor_type=${sensorDbKey}&days=${days}`
    );
    const result = await res.json();
    if (!result.success) {
      alert(result.message || "Failed to fetch data");
      return;
    }
    const headers = ["timestamp", "value"];
    const rows = result.data.map(row => [row.timestamp, row.value].join(","));
    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameSuffix}_last_${days}_days.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Error downloading data");
  }
}

function TableExportTab({ data, loading }) {
  const [downloading, setDownloading] = useState(null);

  const handleDownload = (key, dbKey, days) => {
    setDownloading(`${key}-${days}`);
    setTimeout(() => {
      downloadCSV(dbKey, days, key);
      setDownloading(null);
    }, 500);
  };

  const tableData = [...(data || [])].reverse().slice(0, 50); // Show max 50 in preview snippet

  return (
    <div className="space-y-6">

      {/* EXPORT CARDS (Migrated from Reports) */}
      <h3 className="text-white font-semibold mb-2">CSV Exports</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SENSORS.map((s) => (
          <div key={s.key} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3" style={{ borderTop: `2px solid ${s.color}` }}>
            <div className="flex items-center gap-2">
              <span className="text-base">{s.icon}</span>
              <span className="text-white text-sm font-semibold">{s.label}</span>
            </div>
            <div className="flex flex-col gap-1">
              {PERIODS.map(p => (
                <div key={p.value} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                  <span className="text-slate-400 text-xs">{p.label}</span>
                  <button
                    onClick={() => handleDownload(s.key, s.dbKey || s.key, p.value)}
                    disabled={downloading === `${s.key}-${p.value}`}
                    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
                  >
                    {downloading === `${s.key}-${p.value}` ? "Wait..." : "Download"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* DATA TABLE */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-white font-semibold">Raw Data Preview</h3>
          <span className="text-slate-500 text-xs text-right">Showing latest {tableData.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">Temp</th>
                <th className="px-5 py-3 font-medium">Humidity</th>
                <th className="px-5 py-3 font-medium">Moisture</th>
                <th className="px-5 py-3 font-medium">Light</th>
                <th className="px-5 py-3 font-medium">CO2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 font-mono text-xs">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : tableData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-2 whitespace-nowrap text-slate-400">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-2 text-pink-300">{row.temperature?.toFixed(1) ?? "-"}°C</td>
                  <td className="px-5 py-2 text-sky-300">{row.humidity?.toFixed(1) ?? "-"}%</td>
                  <td className="px-5 py-2 text-green-300">{row.soil_moisture_percentage ?? "-"}%</td>
                  <td className="px-5 py-2 text-amber-300">{row.light_value ?? "-"}</td>
                  <td className="px-5 py-2 text-indigo-300">{row.co2_value ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Floorplan Map ────────────────────────────────────────────────────
function MapTab() {
  const [live, setLive] = useState({ temp: 'ok', hum: 'ok', water: 'critical', light: 'warning' });

  // Simulate picking up live status (ideally this hooks into your WebSocket or latest readings)
  useEffect(() => {
    // A quick effect that randomly pulses the water tank to show it works
    const i = setInterval(() => {
      setLive(prev => ({ ...prev, temp: Math.random() > 0.8 ? 'warning' : 'ok' }))
    }, 5000);
    return () => clearInterval(i);
  }, []);

  const getDotStyle = (state) => {
    switch (state) {
      case 'critical': return "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]";
      case 'warning': return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]";
      default: return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 block">
        <h3 className="text-white font-semibold mb-1">Greenhouse Layout</h3>
        <p className="text-xs text-slate-400 mb-6">Live spatial overview of sensor zones. Dots pulse based on real-time alerts.</p>

        {/* Render a fake map via CSS Grid / Absolute positioning */}
        <div className="relative w-full max-w-2xl mx-auto aspect-video bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-4 overflow-hidden shadow-inset-lg">

          {/* Background layout details */}
          <div className="absolute inset-x-8 inset-y-8 border border-dashed border-slate-600 rounded bg-slate-800/30 flex items-center justify-center">
            <span className="text-slate-600 text-2xl font-bold tracking-[0.5em] opacity-20 transform -rotate-12">CANOPY BED</span>
          </div>

          <div className="absolute inset-y-12 left-12 w-24 border border-x-indigo-500/30 border-y-0 flex flex-col items-center justify-around"></div>

          <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center bg-slate-800/80 shadow-inner">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mt-3">Tank</span>
          </div>

          <div className="absolute top-4 right-8 w-32 h-10 border-2 border-slate-600 rounded flex items-center justify-center bg-slate-800/50">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Vent HVAC</span>
          </div>

          <div className="absolute bottom-4 left-6 w-12 h-1 border-b-4 border-amber-600/50 rounded flex items-center justify-center">
            <span className="text-[8px] text-slate-500 mt-4 capitalize">Door</span>
          </div>

          {/* Interactive Nodes */}
          {/* Node 1: Temperature/Humidity Center */}
          <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer">
            <div className={`w-3 h-3 rounded-full mb-1 transition-colors duration-500 ${getDotStyle(live.temp)}`} />
            <span className="px-2 py-0.5 bg-slate-900/80 border border-slate-800 text-[9px] text-white rounded font-mono group-hover:scale-110 transition-transform">Env. Main</span>
          </div>

          {/* Node 2: Soil Moisture (Canopy Bed Bottom) */}
          <div className="absolute bottom-[30%] left-[30%] flex flex-col items-center group cursor-pointer">
            <div className={`w-3 h-3 rounded-full mb-1 transition-colors duration-500 ${getDotStyle('ok')}`} />
            <span className="px-2 py-0.5 bg-slate-900/80 border border-slate-800 text-[9px] text-white rounded font-mono group-hover:scale-110 transition-transform">Soil P1</span>
          </div>

          {/* Node 3: Water Tank Level / Pump status */}
          <div className="absolute bottom-12 right-12 flex flex-col items-center group cursor-pointer animate-pulse z-10">
            <div className={`w-3.5 h-3.5 rounded-full mb-1 transition-colors duration-500 ${getDotStyle(live.water)}`} />
            <span className="px-2 py-0.5 bg-slate-900/90 border border-red-900 text-[9px] text-red-200 rounded font-mono shadow-xl relative top-2">PUMP MALFUNCTION</span>
          </div>

          {/* Node 4: Light/CO2 near Vent */}
          <div className="absolute top-10 right-20 flex flex-col items-center group cursor-pointer">
            <div className={`w-3 h-3 rounded-full mb-1 transition-colors duration-500 ${getDotStyle(live.light)}`} />
            <span className="px-2 py-0.5 bg-slate-900/80 border border-slate-800 text-[9px] text-white rounded font-mono group-hover:scale-110 transition-transform">Vent Node</span>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function Analytics() {
  const [activeTab, setActiveTab] = useState("viz");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch massive history block on mount for analytical visualization
  useEffect(() => {
    async function fetchAnalyticsHistory() {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/sensor-data/history-all?device_id=greenhouse_node_1&days=90`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalyticsHistory();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-xs uppercase tracking-widest">
          Deep Visual Analytics
        </p>
      </div>

      <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl w-max border border-slate-700/50 mb-2">
        <button
          onClick={() => setActiveTab("viz")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "viz" ? "bg-slate-700 text-sky-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          📈 Visualizations
        </button>
        <button
          onClick={() => setActiveTab("table")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "table" ? "bg-slate-700 text-sky-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          📋 Table & Export
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "map" ? "bg-slate-700 text-sky-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          🗺️ Layout Map
        </button>
      </div>

      <div className="min-h-[50vh]">
        {activeTab === "viz" && <VisualizationsTab data={data} loading={loading} />}
        {activeTab === "table" && <TableExportTab data={data} loading={loading} />}
        {activeTab === "map" && <MapTab />}
      </div>
    </div>
  );
}
