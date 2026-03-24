import { useState } from "react";
import { BASE_URL } from "../api/socketConfig"; // adjust to your config


const SENSORS = [
  { key: "light", label: "Light Sensor", icon: "💡" },
  { key: "co2", label: "CO2 Sensor", icon: "🔷" },
  { key: "moisture", label: "Moisture Sensor", icon: "💧" },
  { key: "temperature", label: "Temperature Sensor", icon: "🌡️" },
];

const PERIODS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
];

const SENSOR_API_MAP = {
  light: "light_value",
  co2: "co2_value",
  moisture: "soil_moisture_percentage",
  temperature: "temperature",
  humidity: "humidity",
};

async function downloadCSV(sensorKey, days) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/v1/sensor-data/history?device_id=greenhouse_node_1&sensor_type=${SENSOR_API_MAP[sensorKey]}&days=${days}`
    );

    const result = await res.json();

    if (!result.success) {
      alert(result.message || "Failed to fetch data");
      return;
    }

    const headers = ["timestamp", "value"];
    const rows = result.data.map((row) =>
      [row.timestamp, row.value].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${sensorKey}_sensor_last_${days}_days.csv`;
    a.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Error downloading data");
  }
}

async function downloadCombinedCSV(selectedKeys) {
  try {
    const headers = ["timestamp", "sensor", "value"];
    let allRows = [];

    for (const key of selectedKeys) {
      const apiSensor = SENSOR_API_MAP[key];
      const res = await fetch(
        `${BASE_URL}/api/v1/sensor-data/history?device_id=greenhouse_node_1&sensor_type=${apiSensor}&days=14`
      );

      const result = await res.json();

      if (result.success) {
        const rows = result.data.map((row) =>
          [row.timestamp, key, row.value].join(",")
        );

        allRows = [...allRows, ...rows];
      }
    }

    const csv = [headers.join(","), ...allRows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `combined_sensor_report.csv`;
    a.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Error generating combined report");
  }
}

function SensorCard({ sensor }) {
  const [loading, setLoading] = useState(null);

  const handleDownload = (days) => {
    setLoading(days);
    setTimeout(() => {
      downloadCSV(sensor.key, days);
      setLoading(null);
    }, 600);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-4" style={{ borderTop: "2px solid #22c55e" }}>
      <div className="flex items-center gap-2">
        <span className="text-base">{sensor.icon}</span>
        <span className="text-white font-semibold text-sm">{sensor.label}</span>
      </div>

      <div className="flex flex-col gap-1">
        {PERIODS.map((period) => (
          <div
            key={period.value}
            className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
          >
            <span className="text-slate-400 text-sm">{period.label}</span>
            <button
              onClick={() => handleDownload(period.value)}
              disabled={loading === period.value}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-green-500 hover:bg-green-400 text-slate-900 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-wait"
            >
              {loading === period.value ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                  Download
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CombinedReportCard() {
  const [selected, setSelected] = useState({
    light: true,
    co2: true,
    moisture: true,
    temperature: false,
  });
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (key) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectedKeys = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const handleGenerate = () => {
    if (selectedKeys.length === 0) return;
    setGenerating(true);
    setDone(false);
    setTimeout(() => {
      downloadCombinedCSV(selectedKeys);
      setGenerating(false);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    }, 1200);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-4" style={{ borderTop: "2px solid #22c55e" }}>
      <div className="flex items-center gap-2">
        <span className="text-base">📊</span>
        <span className="text-white font-semibold text-sm">Generate Combined Report</span>
      </div>

      <div className="flex flex-col gap-2">
        {SENSORS.map((sensor) => (
          <label key={sensor.key} className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={selected[sensor.key]}
                onChange={() => toggle(sensor.key)}
                className="sr-only"
              />
              <div
                className="w-4 h-4 rounded flex items-center justify-center transition-all"
                style={{
                  background: selected[sensor.key] ? "#22c55e" : "transparent",
                  border: `2px solid ${selected[sensor.key] ? "#22c55e" : "#475569"}`,
                }}
              >
                {selected[sensor.key] && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-slate-300 text-sm">{sensor.label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || selectedKeys.length === 0}
        className="w-full py-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed mt-1 flex items-center justify-center gap-2"
        style={{ background: done ? "#16a34a" : "#ef4444" }}
      >
        {generating ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-white">Generating...</span>
          </>
        ) : done ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M5 12l5 5L20 7" />
            </svg>
            <span className="text-white">Downloaded!</span>
          </>
        ) : (
          <span className="text-white">Generate Report</span>
        )}
      </button>

      {selectedKeys.length === 0 && (
        <p className="text-slate-500 text-xs text-center -mt-2">Select at least one sensor</p>
      )}
    </div>
  );
}

export default function Reports() {
  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-xs uppercase tracking-widest">
        Reports — Download Sensor Data
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SENSORS.slice(0, 3).map((sensor) => (
          <SensorCard key={sensor.key} sensor={sensor} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SensorCard sensor={SENSORS[3]} />
        <CombinedReportCard />
      </div>
    </div>
  );
}