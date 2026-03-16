import { useState } from "react";

const SENSORS = [
  { key: "light",       label: "Light Sensor",       icon: "💡" },
  { key: "co2",         label: "CO2 Sensor",          icon: "🔷" },
  { key: "moisture",    label: "Moisture Sensor",     icon: "💧" },
  { key: "temperature", label: "Temperature Sensor",  icon: "🌡️" },
];

export default function Settings() {
  const [statuses, setStatuses] = useState({
    light: true,
    co2: true,
    moisture: true,
    temperature: true,
  });

  const toggle = (key) =>
    setStatuses((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-xs uppercase tracking-widest">
        Device Settings — Sensor Control
      </p>

      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        {SENSORS.map((sensor) => {
          const active = statuses[sensor.key];
          return (
            <div
              key={sensor.key}
              className="flex items-center justify-between px-5 py-4 bg-slate-800 border border-slate-700 rounded-xl"
              style={{ borderLeft: "3px solid #22c55e" }}
            >
              {/* Left: icon + name */}
              <div className="flex items-center gap-3">
                <span className="text-lg">{sensor.icon}</span>
                <span className="text-white font-semibold text-sm">{sensor.label}</span>
              </div>

              {/* Middle: status */}
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: active ? "#22c55e" : "#ef4444" }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: active ? "#22c55e" : "#ef4444" }}
                >
                  {active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Right: toggle button */}
              <button
                onClick={() => toggle(sensor.key)}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 hover:brightness-110"
                style={{ background: active ? "#ef4444" : "#22c55e" }}
              >
                {active ? "Turn Off" : "Turn On"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}