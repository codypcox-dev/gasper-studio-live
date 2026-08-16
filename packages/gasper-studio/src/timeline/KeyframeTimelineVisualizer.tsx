/**
 * Gasper Studio — Interactive Keyframe & Curve Timeline Visualizer.
 * Renders live smoothstep / spline easing curves, 3-beat phase markers (Gather, Peak, Settle, Hold),
 * and channel target keyframes for the active scenario track.
 */

import { useMemo, useState } from "react";
import { THREE_BEAT_SEQUENCES } from "../../../desktop/src/gasper/eight-state-loop/beat-sequence";
import type { EightStateId } from "../../../desktop/src/gasper/eight-state-loop/types";
import { ScenarioClipExporter } from "./ScenarioClipExporter";

export type KeyframeTimelineVisualizerProps = {
  activeStateId?: EightStateId;
  timeMs?: number;
  onScrubMs?: (timeMs: number) => void;
  compact?: boolean;
};

export function KeyframeTimelineVisualizer({
  activeStateId = "presence-neutral-settled",
  timeMs = 0,
  onScrubMs,
  compact = false,
}: KeyframeTimelineVisualizerProps) {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);

  const seq = useMemo(
    () => THREE_BEAT_SEQUENCES[activeStateId] ?? THREE_BEAT_SEQUENCES["presence-neutral-settled"]!,
    [activeStateId],
  );

  const totalDuration = useMemo(() => {
    const sum = seq.phases.reduce((acc, p) => acc + p.durationMs, 0);
    return sum + seq.holdMs;
  }, [seq]);

  // Compute curve points across the 3-beat timeline
  const curvePath = useMemo(() => {
    const points: string[] = [];
    const width = 600;
    const height = 120;

    let elapsed = 0;
    for (let i = 0; i <= 100; i++) {
      const tNorm = i / 100;
      const tMs = tNorm * totalDuration;

      let env = 0.2; // hold baseline
      let curr = 0;
      for (const ph of seq.phases) {
        if (tMs >= curr && tMs <= curr + ph.durationMs) {
          const phNorm = (tMs - curr) / ph.durationMs;
          if (ph.id === "gather") {
            env = 0.2 + phNorm * 0.3; // gather up to 0.5
          } else if (ph.id === "peak") {
            env = 0.5 + Math.sin(phNorm * Math.PI) * 0.45; // peak accent up to 0.95
          } else if (ph.id === "settle") {
            env = 0.95 - phNorm * 0.75; // settle back to 0.2
          }
          break;
        }
        curr += ph.durationMs;
      }

      const x = (tNorm * width).toFixed(1);
      const y = (height - env * height).toFixed(1);
      points.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }

    return points.join(" ");
  }, [seq, totalDuration]);

  const scrubX = (timeMs / totalDuration) * 600;

  return (
    <div
      data-testid="keyframe-timeline-visualizer"
      style={{
        background: "rgba(18, 16, 28, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(138, 92, 246, 0.25)",
        borderRadius: 8,
        padding: compact ? 8 : 14,
        color: "#e2e8f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: 640,
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: "#a78bfa" }}>
            3-BEAT TIMELINE & CURVE
          </span>
          <span
            style={{
              fontSize: 11,
              background: "rgba(167, 139, 250, 0.15)",
              color: "#c4b5fd",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {activeStateId}
          </span>
        </div>
        <span style={{ fontSize: 11, opacity: 0.7 }}>
          {timeMs.toFixed(0)}ms / {totalDuration.toFixed(0)}ms
        </span>
      </div>

      {/* Interactive Curve Canvas SVG */}
      <div
        style={{ position: "relative", cursor: "pointer" }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const norm = Math.max(0, Math.min(1, clickX / rect.width));
          onScrubMs?.(norm * totalDuration);
        }}
      >
        <svg
          viewBox="0 0 600 120"
          style={{
            width: "100%",
            height: compact ? 70 : 100,
            background: "rgba(10, 8, 18, 0.6)",
            borderRadius: 6,
            display: "block",
          }}
        >
          {/* Grid lines */}
          <line x1="0" y1="30" x2="600" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
          <line x1="0" y1="60" x2="600" y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
          <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

          {/* Phase boundary dividers */}
          {(() => {
            let acc = 0;
            return seq.phases.map((ph) => {
              acc += ph.durationMs;
              const x = (acc / totalDuration) * 600;
              return (
                <g key={ph.id}>
                  <line x1={x} y1="0" x2={x} y2="120" stroke="rgba(167, 139, 250, 0.3)" strokeDasharray="2 2" />
                  <text
                    x={x - 6}
                    y="15"
                    fill="#a78bfa"
                    fontSize="9"
                    opacity="0.8"
                    textAnchor="end"
                  >
                    {ph.id.toUpperCase()}
                  </text>
                </g>
              );
            });
          })()}

          {/* Spline / Smoothstep Curve */}
          <path
            d={curvePath}
            fill="none"
            stroke="url(#curveGradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Curve Area Fill */}
          <path
            d={`${curvePath} L 600 120 L 0 120 Z`}
            fill="url(#curveAreaGradient)"
            opacity="0.25"
          />

          {/* Playhead Marker */}
          <line
            x1={scrubX}
            y1="0"
            x2={scrubX}
            y2="120"
            stroke="#22d3ee"
            strokeWidth="2"
          />
          <circle cx={scrubX} cy="60" r="4" fill="#22d3ee" />

          {/* Gradients */}
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="curveAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#12101c" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Phase Badge Bar */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 8,
          fontSize: 10,
        }}
      >
        {seq.phases.map((ph) => (
          <div
            key={ph.id}
            onMouseEnter={() => setHoveredPhase(ph.id)}
            onMouseLeave={() => setHoveredPhase(null)}
            style={{
              flex: ph.durationMs,
              background:
                hoveredPhase === ph.id
                  ? "rgba(167, 139, 250, 0.3)"
                  : "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 4,
              padding: "4px 6px",
              textAlign: "center",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontWeight: 600, color: "#c4b5fd" }}>{ph.id}</div>
            <div style={{ opacity: 0.6, fontSize: 9 }}>
              {ph.durationMs}ms ({ph.easing})
            </div>
          </div>
        ))}
        {seq.holdMs > 0 ? (
          <div
            style={{
              flex: seq.holdMs,
              background: "rgba(34, 211, 238, 0.08)",
              border: "1px solid rgba(34, 211, 238, 0.2)",
              borderRadius: 4,
              padding: "4px 6px",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 600, color: "#22d3ee" }}>hold</div>
            <div style={{ opacity: 0.6, fontSize: 9 }}>{seq.holdMs}ms (anchored)</div>
          </div>
        ) : null}
      </div>

      {/* Embedded Scenario Clip Exporter (SCENARIO-AUTHOR-01) */}
      <div style={{ marginTop: 8 }}>
        <ScenarioClipExporter activeStateId={activeStateId} />
      </div>
    </div>
  );
}
