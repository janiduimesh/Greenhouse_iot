import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Forecast data ────────────────────────────────────────────────────────────

const HOURS = ["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"];

const temperatureData = [
  { time: "Now",  value: 28.5 },
  { time: "+1h",  value: 29.3 },
  { time: "+2h",  value: 30.1 },
  { time: "+3h",  value: 31.0 },
  { time: "+4h",  value: 32.4 },
  { time: "+5h",  value: 33.0 },
  { time: "+6h",  value: 31.8 },
];

const moistureData = [
  { time: "Now",  value: 35 },
  { time: "+1h",  value: 29 },
  { time: "+2h",  value: 23 },
  { time: "+3h",  value: 16 },
  { time: "+4h",  value: 55 },
  { time: "+5h",  value: 60 },
  { time: "+6h",  value: 52 },
];

const lightData = [
  { time: "Now",  value: 450 },
  { time: "+1h",  value: 500 },
  { time: "+2h",  value: 530 },
  { time: "+3h",  value: 510 },
  { time: "+4h",  value: 429 },
  { time: "+5h",  value: 270 },
  { time: "+6h",  value: 110 },
];

const co2Data = [
  { time: "Now",  value: 950 },
  { time: "+1h",  value: 1020 },
  { time: "+2h",  value: 1100 },
  { time: "+3h",  value: 860 },
  { time: "+4h",  value: 650 },
  { time: "+5h",  value: 490 },
  { time: "+6h",  value: 380 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBarColor(value, type) {
  if (type === "temperature") {
    if (value >= 32) return "#ef4444";
    if (value >= 30) return "#f59e0b";
    return "#60a5fa";
  }
  if (type === "moisture") {
    if (value <= 20) return "#ef4444";
    if (value <= 30) return "#f59e0b";
    return "#22c55e";
  }
  if (type === "light") {
    if (value < 150) return "#6b7280";
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
  if (type === "moisture") return `${value}%`;
  if (type === "light") return `${value}lx`;
  if (type === "co2") return `${value}`;
  return value;
}

// ── Mini bar chart (top section) ─────────────────────────────────────────────

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
            {/* outer track */}
            <div className="w-full rounded bg-slate-700/60" style={{ height: 80 }}>
              <div
                className="w-full rounded transition-all"
                style={{
                  height: `${heightPct}%`,
                  background: color,
                  marginTop: `${100 - heightPct}%`,
                }}
              />
            </div>
            <span className="text-white text-xs font-medium">
              {formatValue(d.value, type)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Area chart (bottom section) ───────────────────────────────────────────────

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
        <XAxis
          dataKey="time"
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={yDomain}
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={35}
        />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: color }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={{ fill: color, r: 3, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ text, variant }) {
  const styles = {
    warning: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#f59e0b", dot: "#f59e0b" },
    danger:  { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",  text: "#ef4444", dot: "#ef4444" },
    success: { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  text: "#22c55e", dot: "#22c55e" },
  };
  const s = styles[variant] || styles.warning;
  return (
    <span
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {text}
    </span>
  );
}

// ── Alert bar ─────────────────────────────────────────────────────────────────

function AlertBar({ text, variant }) {
  const styles = {
    danger:  { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  dot: "#ef4444", text: "#fca5a5" },
    success: { bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.3)",  dot: "#22c55e", text: "#86efac" },
  };
  const s = styles[variant] || styles.danger;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      <span style={{ color: s.text }}>{text}</span>
    </div>
  );
}

// ── Forecast card ─────────────────────────────────────────────────────────────

function ForecastCard({ title, icon, iconColor, badge, barData, areaData, areaColor, gradientId, yDomain, alertText, alertVariant, maxBarValue }) {
  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: iconColor }} className="text-lg">{icon}</span>
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <StatusBadge text={badge.text} variant={badge.variant} />
      </div>

      {/* Bar row */}
      <BarRow data={barData} type={barData[0]?._type || title.toLowerCase().split(" ")[0]} maxValue={maxBarValue} />

      {/* Area chart */}
      <ForecastAreaChart
        data={areaData}
        color={areaColor}
        gradientId={gradientId}
        yDomain={yDomain}
      />

      {/* Alert */}
      <AlertBar text={alertText} variant={alertVariant} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Forecast() {
  // tag each data point with type for color logic
  const tempBar  = temperatureData.map((d) => ({ ...d, _type: "temperature" }));
  const moistBar = moistureData.map((d) => ({ ...d, _type: "moisture" }));
  const lightBar = lightData.map((d) => ({ ...d, _type: "light" }));
  const co2Bar   = co2Data.map((d) => ({ ...d, _type: "co2" }));

  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-xs uppercase tracking-widest">
        Forecast — Next 6 Hours
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Temperature */}
        <ForecastCard
          title="Temperature Forecast"
          icon="🌡️"
          iconColor="#f472b6"
          badge={{ text: "⚠ Will exceed 32°C at +4h", variant: "warning" }}
          barData={tempBar}
          areaData={temperatureData}
          areaColor="#60a5fa"
          gradientId="tempGrad"
          yDomain={[25, 35]}
          alertText="Action: Consider activating ventilation fans in 3–4 hours to prevent heat stress."
          alertVariant="danger"
          maxBarValue={38}
        />

        {/* Moisture */}
        <ForecastCard
          title="Moisture Forecast"
          icon="💧"
          iconColor="#38bdf8"
          badge={{ text: "● Critical low in +3h", variant: "danger" }}
          barData={moistBar}
          areaData={moistureData}
          areaColor="#22c55e"
          gradientId="moistGrad"
          yDomain={[0, 80]}
          alertText="Action: Schedule irrigation pump to trigger at +2h 30min to prevent dry-out."
          alertVariant="danger"
          maxBarValue={80}
        />

        {/* Light */}
        <ForecastCard
          title="Light Forecast"
          icon="💡"
          iconColor="#f59e0b"
          badge={{ text: "✓ Normal pattern", variant: "success" }}
          barData={lightBar}
          areaData={lightData}
          areaColor="#f59e0b"
          gradientId="lightGrad"
          yDomain={[0, 600]}
          alertText="Light levels follow normal daily curve. Peak expected at +2h, dimming after +5h."
          alertVariant="success"
          maxBarValue={600}
        />

        {/* CO2 */}
        <ForecastCard
          title="CO₂ Forecast"
          icon="🔷"
          iconColor="#818cf8"
          badge={{ text: "● Critically high — rising", variant: "danger" }}
          barData={co2Bar}
          areaData={co2Data}
          areaColor="#ef4444"
          gradientId="co2Grad"
          yDomain={[0, 1300]}
          alertText="Action: Open vents immediately. CO₂ will peak at ~1100ppm within 2 hours before gradually falling."
          alertVariant="danger"
          maxBarValue={1300}
        />

      </div>
    </div>
  );
}