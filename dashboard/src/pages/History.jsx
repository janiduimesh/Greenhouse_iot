import { useState, useEffect, useRef } from "react";
import { BASE_URL, SENSOR_WS_URL } from "../api/socketConfig";

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(timestamp) {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const SEVERITY_STYLES = {
  critical: {
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
    dot: "#ef4444",
    text: "#fca5a5",
    label: "Critical",
    labelBg: "rgba(239,68,68,0.20)",
    labelBorder: "rgba(239,68,68,0.40)",
  },
  warning: {
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.30)",
    dot: "#f59e0b",
    text: "#fde68a",
    label: "Warning",
    labelBg: "rgba(245,158,11,0.20)",
    labelBorder: "rgba(245,158,11,0.40)",
  },
};

const SENSOR_UNITS = {
  temperature: "°C",
  humidity: "%",
  soil_moisture_percentage: "%",
  co2_value: " ppm",
  light_value: "",
};

const SENSOR_LABELS = {
  temperature: "Temperature",
  humidity: "Humidity",
  soil_moisture_percentage: "Soil Moisture",
  co2_value: "CO₂",
  light_value: "Light",
};

// ── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert, isNew }) {
  const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.warning;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all ${isNew ? "animate-pulse-once" : ""
        }`}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      {/* Icon */}
      <span className="text-lg flex-shrink-0 mt-0.5">{alert.icon || "⚠"}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium" style={{ color: s.text }}>
            {alert.message}
          </p>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: s.labelBg,
              border: `1px solid ${s.labelBorder}`,
              color: s.dot,
            }}
          >
            {s.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-500">
            {SENSOR_LABELS[alert.sensor] || alert.sensor}:{" "}
            <span className="text-slate-300 font-medium">
              {alert.value}
              {SENSOR_UNITS[alert.sensor] || ""}
            </span>
          </span>
          <span className="text-xs text-slate-600">•</span>
          <span className="text-xs text-slate-500">
            {timeAgo(alert.timestamp)}
          </span>
        </div>
      </div>

      {/* Severity dot */}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2"
        style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}` }}
      />
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ summary, wsConnected }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-red-400">
          {summary.critical}
        </p>
        <p className="text-xs text-slate-500 mt-1">Critical (24h)</p>
      </div>
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-amber-400">
          {summary.warning}
        </p>
        <p className="text-xs text-slate-500 mt-1">Warning (24h)</p>
      </div>
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
          />
          <p
            className={`text-sm font-semibold ${wsConnected ? "text-green-400" : "text-red-400"
              }`}
          >
            {wsConnected ? "Live" : "Offline"}
          </p>
        </div>
        <p className="text-xs text-slate-500 mt-1">Sensor Feed</p>
      </div>
    </div>
  );
}

// ── Filter Tabs ──────────────────────────────────────────────────────────────

function FilterTabs({ filter, setFilter, counts }) {
  const tabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "critical", label: "Critical", count: counts.critical, color: "#ef4444" },
    { key: "warning", label: "Warning", count: counts.warning, color: "#f59e0b" },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setFilter(tab.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === tab.key
              ? "bg-slate-700 text-white"
              : "text-slate-500 hover:text-slate-300"
            }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]"
              style={{
                background: tab.color
                  ? `${tab.color}20`
                  : "rgba(148,163,184,0.2)",
                color: tab.color || "#94a3b8",
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function History() {
  const [alerts, setAlerts] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, warning: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [wsConnected, setWsConnected] = useState(false);
  const [hours, setHours] = useState(24);
  const newAlertIds = useRef(new Set());

  // Fetch historical alerts from API
  async function fetchAlerts() {
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/alerts?device_id=greenhouse_node_1&hours=${hours}&limit=200`
      );
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch summary
  async function fetchSummary() {
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/alerts/summary?device_id=greenhouse_node_1`
      );
      if (res.ok) {
        const data = await res.json();
        setSummary(data.last_24h || { critical: 0, warning: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  }

  // Fetch on mount and when hours changes
  useEffect(() => {
    fetchAlerts();
    fetchSummary();
  }, [hours]);

  // WebSocket for real-time alerts
  useEffect(() => {
    const socket = new WebSocket(SENSOR_WS_URL);

    socket.onopen = () => {
      setWsConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // If the broadcast includes alerts, add them to live alerts
      if (data.alerts && data.alerts.length > 0) {
        const newAlerts = data.alerts.map((a, i) => ({
          ...a,
          id: `live-${Date.now()}-${i}`,
        }));

        // Mark as new for animation
        newAlerts.forEach((a) => newAlertIds.current.add(a.id));
        setTimeout(() => {
          newAlerts.forEach((a) => newAlertIds.current.delete(a.id));
        }, 3000);

        setLiveAlerts((prev) => [...newAlerts, ...prev].slice(0, 50));

        // Update summary counts
        setSummary((prev) => {
          const updated = { ...prev };
          newAlerts.forEach((a) => {
            if (a.severity in updated) {
              updated[a.severity]++;
            }
          });
          return updated;
        });
      }
    };

    socket.onerror = () => setWsConnected(false);
    socket.onclose = () => setWsConnected(false);

    return () => socket.close();
  }, []);

  // Merge live + historical, dedupe, sort
  const allAlerts = [...liveAlerts, ...alerts].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const filteredAlerts =
    filter === "all"
      ? allAlerts
      : allAlerts.filter((a) => a.severity === filter);

  const counts = {
    all: allAlerts.length,
    critical: allAlerts.filter((a) => a.severity === "critical").length,
    warning: allAlerts.filter((a) => a.severity === "warning").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-xs uppercase tracking-widest">
          Alerts — Real-Time Monitoring
        </p>
        <select
          value={hours}
          onChange={(e) => {
            setHours(Number(e.target.value));
            setLoading(true);
          }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-green-500"
        >
          <option value={1}>Last 1 hour</option>
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={72}>Last 3 days</option>
          <option value={168}>Last 7 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <SummaryCard summary={summary} wsConnected={wsConnected} />

      {/* Filter + Refresh */}
      <div className="flex items-center justify-between">
        <FilterTabs filter={filter} setFilter={setFilter} counts={counts} />
        <button
          onClick={() => {
            setLoading(true);
            fetchAlerts();
            fetchSummary();
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 transition-all"
        >
          Refresh
        </button>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <span className="text-3xl mb-2"></span>
            <p className="text-sm font-medium">No alerts</p>
            <p className="text-xs mt-1">All sensor values are within safe ranges</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isNew={newAlertIds.current.has(alert.id)}
            />
          ))
        )}
      </div>

      {/* Threshold Reference */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Alert Thresholds
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              icon: "🌡️",
              label: "Temp",
              rules: [">35° critical", ">30° warning", "<10° warning"],
            },
            {
              icon: "💧",
              label: "Humidity",
              rules: [">90% warning", "<30% warning"],
            },
            {
              icon: "🪴",
              label: "Soil",
              rules: ["<15% critical", "<25% warning"],
            },
            {
              icon: "💨",
              label: "CO₂",
              rules: [">1000 critical", ">700 warning"],
            },
            {
              icon: "💡",
              label: "Light",
              rules: ["<200 warning"],
            },
          ].map((t) => (
            <div key={t.label} className="text-center">
              <span className="text-lg">{t.icon}</span>
              <p className="text-white text-xs font-medium mt-1">{t.label}</p>
              {t.rules.map((r, i) => (
                <p key={i} className="text-slate-500 text-[10px]">
                  {r}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
