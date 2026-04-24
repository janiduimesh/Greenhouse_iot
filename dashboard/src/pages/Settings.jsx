import { useState, useEffect } from "react";
import { BASE_URL } from "../api/socketConfig";

const ACTUATOR_ORDER = ["pump", "fan", "servo", "buzzer", "light"];

export default function Settings() {
  const [actuators, setActuators] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch actual device status from backend
  async function fetchStatus() {
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/device/status?device_id=greenhouse_node_1`
      );
      if (res.ok) {
        const data = await res.json();
        setActuators(data.actuators || {});
        setLastUpdate(data.last_update);
      }
    } catch (err) {
      console.error("Failed to fetch device status:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    // Poll every 10s to reflect ESP32 updates
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Send command to toggle actuator
  async function toggleActuator(key) {
    const current = actuators[key];
    if (!current) return;

    const currentStatus = current.status;
    const newAction = currentStatus === "on" ? "off" : "on";

    setSending((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/device/command?device_id=greenhouse_node_1&actuator=${key}&action=${newAction}`,
        { method: "POST" }
      );

      if (res.ok) {
        // Optimistically update UI with pending state
        setActuators((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            pending_action: newAction,
          },
        }));
      }
    } catch (err) {
      console.error("Failed to send command:", err);
    } finally {
      setSending((prev) => ({ ...prev, [key]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-xs uppercase tracking-widest">
          Device Settings — Actuator Control
        </p>
        {lastUpdate && (
          <p className="text-slate-600 text-xs">
            Last reading: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        {ACTUATOR_ORDER.map((key) => {
          const a = actuators[key];
          if (!a) return null;

          const isOn = a.status === "on";
          const isPending = !!a.pending_action;
          const isSending = sending[key];

          return (
            <div
              key={key}
              className="flex items-center justify-between px-5 py-4 bg-slate-800 border border-slate-700 rounded-xl transition-all"
              style={{
                borderLeft: `3px solid ${
                  isPending ? "#f59e0b" : isOn ? "#22c55e" : "#64748b"
                }`,
              }}
            >
              {/* Left: icon + name */}
              <div className="flex items-center gap-3">
                <span className="text-lg">{a.icon}</span>
                <div>
                  <span className="text-white font-semibold text-sm">{a.label}</span>
                  {isPending && (
                    <p className="text-amber-400 text-[10px] mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                      Waiting for device to pick up command...
                    </p>
                  )}
                </div>
              </div>

              {/* Middle: status */}
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: isPending
                      ? "#f59e0b"
                      : isOn
                      ? "#22c55e"
                      : a.status === "unknown"
                      ? "#64748b"
                      : "#ef4444",
                  }}
                />
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isPending
                      ? "#f59e0b"
                      : isOn
                      ? "#22c55e"
                      : a.status === "unknown"
                      ? "#64748b"
                      : "#ef4444",
                  }}
                >
                  {isPending
                    ? `→ ${a.pending_action.toUpperCase()}`
                    : a.status === "unknown"
                    ? "Unknown"
                    : isOn
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>

              {/* Right: toggle button */}
              <button
                onClick={() => toggleActuator(key)}
                disabled={isSending || isPending}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 hover:brightness-110 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                style={{
                  background: isOn ? "#ef4444" : "#22c55e",
                }}
              >
                {isSending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : isOn ? (
                  "Turn Off"
                ) : (
                  "Turn On"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* How it works info */}
      <div className="max-w-3xl mx-auto bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
          How Device Control Works
        </h3>
        <div className="space-y-1.5 text-xs text-slate-500">
          <p>
            <span className="text-green-400">1.</span> You press <strong className="text-slate-300">Turn On/Off</strong> — command is queued on the server
          </p>
          <p>
            <span className="text-green-400">2.</span> ESP32 polls for pending commands every <strong className="text-slate-300">5 seconds</strong>
          </p>
          <p>
            <span className="text-green-400">3.</span> Device executes the command and reports back in its next sensor reading
          </p>
          <p>
            <span className="text-amber-400">⚠</span> If the device is offline, commands will queue until it reconnects
          </p>
        </div>
      </div>
    </div>
  );
}