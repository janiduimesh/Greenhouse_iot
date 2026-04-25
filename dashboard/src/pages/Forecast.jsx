import { useMemo, useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { BASE_URL } from "../api/socketConfig"; // adjust to your config

// ── Helpers ──────────────────────────────────────────────────────────────────

const HOUR_LABELS = ["+1h", "+2h", "+3h", "+4h", "+5h", "+6h"];

function toLightBrightness(raw) {
  return Math.round(((4095 - raw) / 4095) * 100);
}

function transformForecast(forecast) {
  return forecast.map((item, i) => ({
    time: HOUR_LABELS[i] ?? `+${i}h`,
    temperature: item.temperature,
    humidity: item.humidity,
    moisture: item.soil_moisture_percentage,
    light: toLightBrightness(item.light_value),
    co2: item.co2_value,
  }));
}

function getBarColor(value, type) {
  if (type === "temperature") {
    if (value >= 30) return "#ef4444";
    if (value >= 28) return "#f59e0b";
    return "#60a5fa";
  }
  if (type === "moisture") {
    if (value <= 20) return "#ef4444";
    if (value <= 30) return "#f59e0b";
    return "#22c55e";
  }
  if (type === "humidity") {
    if (value >= 70) return "#ef4444";
    if (value <= 30) return "#f59e0b";
    return "#22c55e";
  }
  if (type === "light") {
    if (value < 20) return "#6b7280";
    return "#f59e0b";
  }
  if (type === "co2") {
    if (value >= 1000) return "#ef4444";
    if (value >= 700) return "#f59e0b";
    return "#22c55e";
  }
  return "#60a5fa";
}

function formatValue(value, type) {
  if (type === "temperature") return `${value}°`;
  if (type === "humidity") return `${value}%`;
  if (type === "moisture") return `${value}%`;
  if (type === "light") return `${value}%`;
  if (type === "co2") return `${value}`;
  return value;
}

// ── Dynamic badge + alert generators ─────────────────────────────────────────

function getTempMeta(data) {
  const peak = Math.max(...data.map((d) => d.temperature));
  const peakIdx = data.findIndex((d) => d.temperature === peak);
  if (peak >= 30) return {
    badge: { text: `⚠ Will exceed 30°C at ${HOUR_LABELS[peakIdx]}`, variant: "warning" },
    alert: { text: `Action: Consider activating ventilation fans around ${HOUR_LABELS[peakIdx]} to prevent heat stress.`, variant: "danger" },
  };
  return {
    badge: { text: "✓ Temperature stable", variant: "success" },
    alert: { text: "Temperature remains within safe range for the next 6 hours.", variant: "success" },
  };
}

function getMoistureMeta(data) {
  const min = Math.min(...data.map((d) => d.moisture));
  const minIdx = data.findIndex((d) => d.moisture === min);
  if (min <= 20) return {
    badge: { text: `● Critical low at ${HOUR_LABELS[minIdx]}`, variant: "danger" },
    alert: { text: `Action: Schedule irrigation pump before ${HOUR_LABELS[minIdx]} to prevent dry-out.`, variant: "danger" },
  };
  if (min <= 30) return {
    badge: { text: `⚠ Low moisture at ${HOUR_LABELS[minIdx]}`, variant: "warning" },
    alert: { text: `Moisture may drop to ${min}% at ${HOUR_LABELS[minIdx]}. Monitor irrigation.`, variant: "danger" },
  };
  return {
    badge: { text: "✓ Moisture stable", variant: "success" },
    alert: { text: "Soil moisture remains within healthy range for the next 6 hours.", variant: "success" },
  };
}

function getHumidityMeta(data) {
  const peak = Math.max(...data.map((d) => d.humidity));
  const peakIdx = data.findIndex((d) => d.humidity === peak);
  if (peak >= 70) return {
    badge: { text: `● High humidity at ${HOUR_LABELS[peakIdx]}`, variant: "danger" },
    alert: { text: `Humidity may reach ${peak}%. Consider activating fans.`, variant: "danger" },
  };
  const min = Math.min(...data.map((d) => d.humidity));
  const minIdx = data.findIndex((d) => d.humidity === min);
  if (min <= 30) return {
    badge: { text: `⚠ Low humidity at ${HOUR_LABELS[minIdx]}`, variant: "warning" },
    alert: { text: `Humidity might drop to ${min}%. Consider misting.`, variant: "warning" },
  };
  return {
    badge: { text: "✓ Humidity normal", variant: "success" },
    alert: { text: "Humidity remains within optimal range.", variant: "success" },
  };
}

function getLightMeta(data) {
  const peak = Math.max(...data.map((d) => d.light));
  const peakIdx = data.findIndex((d) => d.light === peak);
  return {
    badge: { text: "✓ Normal pattern", variant: "success" },
    alert: { text: `Light levels follow normal curve. Peak brightness ${peak}% expected at ${HOUR_LABELS[peakIdx]}.`, variant: "success" },
  };
}

function getCo2Meta(data) {
  const peak = Math.max(...data.map((d) => d.co2));
  const peakIdx = data.findIndex((d) => d.co2 === peak);
  if (peak >= 1000) return {
    badge: { text: "● Critically high — rising", variant: "danger" },
    alert: { text: `Action: Open vents immediately. CO₂ will peak at ~${peak}ppm at ${HOUR_LABELS[peakIdx]}.`, variant: "danger" },
  };
  if (peak >= 700) return {
    badge: { text: `⚠ Elevated CO₂ at ${HOUR_LABELS[peakIdx]}`, variant: "warning" },
    alert: { text: `CO₂ may reach ${peak}ppm at ${HOUR_LABELS[peakIdx]}. Consider improving ventilation.`, variant: "danger" },
  };
  return {
    badge: { text: "✓ CO₂ normal", variant: "success" },
    alert: { text: "CO₂ levels remain within safe range for the next 6 hours.", variant: "success" },
  };
}

// ── Sub-components (unchanged from your original) ─────────────────────────────

function BarRow({ data, type, maxValue }) {
  const max = maxValue || Math.max(...data.map((d) => d.value)) * 1.2;
  return (
    <div className="flex items-end gap-3 px-1">
      {data.map((d, i) => {
        const color = getBarColor(d.value, type);
        const heightPct = (d.value / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-slate-400 text-xs">{d.time}</span>
            <div className="w-2/3 rounded bg-slate-700/60" style={{ height: 80 }}>
              <div
                className="w-full rounded transition-all"
                style={{ height: `${heightPct}%`, background: color, marginTop: `${100 - heightPct}%` }}
              />
            </div>
            <span className="text-white text-xs font-medium">{formatValue(d.value, type)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ForecastAreaChart({ data, color, gradientId, yDomain }) {
  return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.5} />
            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={yDomain} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={{ fill: color, r: 3, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatusBadge({ text, variant }) {
  const styles = {
    warning: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#f59e0b", dot: "#f59e0b" },
    danger: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", text: "#ef4444", dot: "#ef4444" },
    success: { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", text: "#22c55e", dot: "#22c55e" },
  };
  const s = styles[variant] || styles.warning;
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {text}
    </span>
  );
}

function AlertBar({ text, variant }) {
  const styles = {
    danger: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", dot: "#ef4444", text: "#fca5a5" },
    success: { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.3)", dot: "#22c55e", text: "#86efac" },
  };
  const s = styles[variant] || styles.danger;
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      <span style={{ color: s.text }}>{text}</span>
    </div>
  );
}

function ForecastCard({ title, icon, iconColor, badge, barData, areaData, areaColor, gradientId, yDomain, alertText, alertVariant, maxBarValue, type }) {
  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: iconColor }} className="text-lg">{icon}</span>
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <StatusBadge text={badge.text} variant={badge.variant} />
      </div>
      <BarRow data={barData} type={type} maxValue={maxBarValue} />
      <ForecastAreaChart data={areaData} color={areaColor} gradientId={gradientId} yDomain={yDomain} />
      <AlertBar text={alertText} variant={alertVariant} />
    </div>
  );
}

// ── Loading / Error states ────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Loading forecast...</div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="text-red-400 text-sm">{message}</div>
      <button onClick={onRetry} className="px-4 py-2 bg-slate-700 text-white text-sm rounded hover:bg-slate-600">
        Retry
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Forecast() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/predict-sensors?device_id=greenhouse_node_1`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setForecast(transformForecast(json.forecast));
      setGeneratedAt(new Date(json.generated_at).toLocaleTimeString());
    } catch (err) {
      setError(err.message || "Failed to load forecast");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForecast(); }, []);

  const tempData = useMemo(() => forecast?.map((d) => ({ time: d.time, value: d.temperature })) ?? [], [forecast]);
  const humidData = useMemo(() => forecast?.map((d) => ({ time: d.time, value: d.humidity })) ?? [], [forecast]);
  const moistData = useMemo(() => forecast?.map((d) => ({ time: d.time, value: d.moisture })) ?? [], [forecast]);
  const lightData = useMemo(() => forecast?.map((d) => ({ time: d.time, value: d.light })) ?? [], [forecast]);
  const co2Data = useMemo(() => forecast?.map((d) => ({ time: d.time, value: d.co2 })) ?? [], [forecast]);

  const tempMeta = useMemo(() => forecast ? getTempMeta(forecast) : null, [forecast]);
  const humidMeta = useMemo(() => forecast ? getHumidityMeta(forecast) : null, [forecast]);
  const moistMeta = useMemo(() => forecast ? getMoistureMeta(forecast) : null, [forecast]);
  const lightMeta = useMemo(() => forecast ? getLightMeta(forecast) : null, [forecast]);
  const co2Meta = useMemo(() => forecast ? getCo2Meta(forecast) : null, [forecast]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchForecast} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-xs uppercase tracking-widest">Forecast — Next 6 Hours</p>
        <p className="text-slate-600 text-xs">Generated at {generatedAt}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <ForecastCard
          title="Temperature Forecast" icon="🌡️" iconColor="#f472b6"
          type="temperature"
          badge={tempMeta.badge}
          barData={tempData} areaData={tempData} areaColor="#60a5fa"
          gradientId="tempGrad" yDomain={[25, 38]} maxBarValue={38}
          alertText={tempMeta.alert.text} alertVariant={tempMeta.alert.variant}
        />

        <ForecastCard
          title="Humidity Forecast" icon="☁️" iconColor="#7dd3fc"
          type="humidity"
          badge={humidMeta.badge}
          barData={humidData} areaData={humidData} areaColor="#7dd3fc"
          gradientId="humidGrad" yDomain={[0, 100]} maxBarValue={100}
          alertText={humidMeta.alert.text} alertVariant={humidMeta.alert.variant}
        />

        <ForecastCard
          title="Moisture Forecast" icon="💧" iconColor="#38bdf8"
          type="moisture"
          badge={moistMeta.badge}
          barData={moistData} areaData={moistData} areaColor="#22c55e"
          gradientId="moistGrad" yDomain={[0, 100]} maxBarValue={100}
          alertText={moistMeta.alert.text} alertVariant={moistMeta.alert.variant}
        />

        <ForecastCard
          title="Light Forecast" icon="💡" iconColor="#f59e0b"
          type="light"
          badge={lightMeta.badge}
          barData={lightData} areaData={lightData} areaColor="#f59e0b"
          gradientId="lightGrad" yDomain={[0, 100]} maxBarValue={100}
          alertText={lightMeta.alert.text} alertVariant={lightMeta.alert.variant}
        />

        <ForecastCard
          title="CO₂ Forecast" icon="🔷" iconColor="#818cf8"
          type="co2"
          badge={co2Meta.badge}
          barData={co2Data} areaData={co2Data} areaColor="#ef4444"
          gradientId="co2Grad" yDomain={[0, 1300]} maxBarValue={1300}
          alertText={co2Meta.alert.text} alertVariant={co2Meta.alert.variant}
        />

      </div>
    </div>
  );
}