/**
 * Gasper Studio — Scenario Clip Exporter & Authoring Tool (SCENARIO-AUTHOR-01).
 * Serializes live 3-beat keyframes, embodiment targets, and rig parameters
 * into valid, compiled .gasper project scenario documents.
 */

import { useState } from "react";
import { THREE_BEAT_SEQUENCES } from "../../../desktop/src/gasper/eight-state-loop/beat-sequence";

export type ScenarioClipExporterProps = {
  activeStateId?: string;
  activeEmbodimentId?: string;
  reliefScale?: number;
  yawDeg?: number;
};

export function ScenarioClipExporter({
  activeStateId = "presence-neutral-settled",
  activeEmbodimentId = "presence",
  reliefScale = 0.42,
  yawDeg = 8,
}: ScenarioClipExporterProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const generateScenarioJson = () => {
    const seq = THREE_BEAT_SEQUENCES[activeStateId as keyof typeof THREE_BEAT_SEQUENCES] ?? THREE_BEAT_SEQUENCES["presence-neutral-settled"]!;
    
    return JSON.stringify(
      {
        schema: "gasper.scenario.v1",
        version: "1.0.0",
        authoredAt: new Date().toISOString(),
        metadata: {
          title: `Authored Clip — ${activeStateId}`,
          embodiment: activeEmbodimentId,
          stateId: activeStateId,
          totalDurationMs: seq.phases.reduce((a, p) => a + p.durationMs, 0) + seq.holdMs,
        },
        rigParameters: {
          reliefScale,
          yawDegrees: yawDeg,
          eyeOpenness: 0.55,
          energyLevel: 0.72,
        },
        sequenceTrack: {
          stateId: activeStateId,
          holdMs: seq.holdMs,
          phases: seq.phases.map((p) => ({
            id: p.id,
            durationMs: p.durationMs,
            easing: p.easing,
            accentPeak: (p.targets as any)?.accentPeak ?? 0,
          })),
        },
      },
      null,
      2,
    );
  };

  const handleCopy = () => {
    const json = generateScenarioJson();
    navigator.clipboard?.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const json = generateScenarioJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeStateId}.gasper`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="scenario-clip-exporter"
      style={{
        background: "rgba(14, 12, 26, 0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(167, 139, 250, 0.3)",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#e2e8f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 11,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, color: "#c4b5fd", fontSize: 11 }}>
          SCENARIO EXPORTER (.gasper)
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: "rgba(167, 139, 250, 0.15)",
            border: "1px solid rgba(167, 139, 250, 0.3)",
            color: "#c4b5fd",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 10,
          }}
        >
          {isOpen ? "Close" : "Export Clip"}
        </button>
      </div>

      {isOpen ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            readOnly
            value={generateScenarioJson()}
            style={{
              width: "100%",
              height: 120,
              background: "rgba(8, 6, 16, 0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              color: "#34d399",
              fontFamily: "monospace",
              fontSize: 10,
              padding: 6,
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                background: copied ? "rgba(52, 211, 153, 0.2)" : "rgba(34, 211, 238, 0.15)",
                border: `1px solid ${copied ? "#34d399" : "#22d3ee"}`,
                color: copied ? "#34d399" : "#22d3ee",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              {copied ? "Copied JSON!" : "Copy .gasper JSON"}
            </button>
            <button
              onClick={handleDownload}
              style={{
                flex: 1,
                background: "rgba(167, 139, 250, 0.15)",
                border: "1px solid #a78bfa",
                color: "#c4b5fd",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              Download File
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
