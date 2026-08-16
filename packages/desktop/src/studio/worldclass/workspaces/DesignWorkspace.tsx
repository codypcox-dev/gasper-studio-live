import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { StageFrame } from "../shell/StageFrame";
import type { ReactNode } from "react";

export function DesignWorkspace({
  snap,
  adapter,
  stageSlot,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
  stageSlot: ReactNode;
}) {
  const domain = snap.designDomains.find((d) => d.id === snap.activeDesignDomain);
  return (
    <div
      className="gwc-center"
      data-testid="gwc-workspace-form"
      data-workspace="form"
      data-job="form"
      data-legacy-workspace="design"
    >
      <div className="gwc-design-domains" data-testid="gwc-design-domains">
        {snap.designDomains.map((d) => (
          <button
            key={d.id}
            type="button"
            className="gwc-domain-card"
            aria-pressed={snap.activeDesignDomain === d.id}
            data-testid={`gwc-design-card-${d.id}`}
            onClick={() => adapter.setDesignDomain(d.id)}
          >
            <strong>{d.label}</strong>
            <span>{d.summary}</span>
          </button>
        ))}
      </div>
      <StageFrame snap={snap} stageSlot={stageSlot} adapter={adapter} />
      {domain && domain.parameters.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "8px 12px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(0,0,0,0.25)",
            flexWrap: "wrap",
          }}
          data-testid="gwc-design-params"
        >
          {domain.parameters.map((p) => (
            <label
              key={p.id}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#9b9ba8" }}
            >
              {p.label}
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={(p.max - p.min) / 100 || 0.01}
                value={p.value}
                data-testid={`gwc-param-${p.id}`}
                // Continuous drag: preview-only (no document txn).
                // React range onChange also fires per tick — keep it preview-only.
                onInput={(e) =>
                  adapter.previewDesignParameter?.(
                    domain.id,
                    p.id,
                    Number((e.target as HTMLInputElement).value),
                  )
                }
                onChange={(e) =>
                  adapter.previewDesignParameter?.(
                    domain.id,
                    p.id,
                    Number(e.target.value),
                  )
                }
                // Discrete commit on release / keyboard settle: document + rig commit.
                onPointerUp={(e) =>
                  adapter.setDesignParameter?.(
                    domain.id,
                    p.id,
                    Number((e.target as HTMLInputElement).value),
                  )
                }
                onBlur={(e) =>
                  adapter.setDesignParameter?.(
                    domain.id,
                    p.id,
                    Number((e.target as HTMLInputElement).value),
                  )
                }
              />
              <span style={{ color: "#ececf2", fontVariantNumeric: "tabular-nums", minWidth: 36 }}>
                {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
                {p.unit ?? ""}
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
