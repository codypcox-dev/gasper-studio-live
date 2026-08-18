/**
 * Score versions — Factory / Autosave / named publishes.
 * Git pins the engine. This strip publishes the organism.
 */
import { useCallback, useEffect, useState, type ReactElement } from "react";
import {
  deletePublish,
  emitRevisionChanged,
  factoryRevision,
  listPublishes,
  onRevisionBridge,
  readAutosave,
  REVISION_CHANGED_EVENT,
  revisionBridge,
  savePublish,
  type GasperRevision,
} from "../../../desktop/src/gasper/revision";

function lookName(): string {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "p" : "a";
  const hr = ((h + 11) % 12) + 1;
  return `Look ${hr}:${m}${ap}`;
}

export function VersionStrip(): ReactElement {
  const [, tick] = useState(0);
  const refresh = useCallback(() => tick((n) => n + 1), []);

  useEffect(() => {
    const off = onRevisionBridge(refresh);
    const on = () => refresh();
    window.addEventListener(REVISION_CHANGED_EVENT, on);
    return () => {
      off();
      window.removeEventListener(REVISION_CHANGED_EVENT, on);
    };
  }, [refresh]);

  const autosave = readAutosave();
  const publishes = listPublishes();

  const hydrate = (rev: GasperRevision) => {
    revisionBridge()?.hydrate(rev);
    refresh();
  };

  const saveLook = () => {
    const api = revisionBridge();
    if (!api) return;
    const rev = api.capture(lookName(), "publish");
    savePublish(rev);
    emitRevisionChanged();
    refresh();
  };

  return (
    <div className="revision-strip" data-testid="revision-strip" role="group" aria-label="Looks">
      <button
        type="button"
        data-testid="revision-factory"
        title="Factory Wispwalker — publish v000, read-only"
        onClick={() => hydrate(factoryRevision())}
      >
        Factory
      </button>
      <button
        type="button"
        data-testid="revision-autosave"
        disabled={!autosave}
        title={autosave ? `Autosave ${autosave.capturedAt}` : "No autosave yet"}
        onClick={() => autosave && hydrate(autosave)}
      >
        Autosave
      </button>
      <div className="revision-strip__looks">
        {publishes.map((p) => (
          <span key={p.id} className="revision-strip__chip">
            <button type="button" data-testid={`revision-look-${p.id}`} title={`${p.name} · ${p.capturedAt}`} onClick={() => hydrate(p)}>
              {p.name}
            </button>
            <button
              type="button"
              className="revision-strip__drop"
              aria-label={`Delete ${p.name}`}
              onClick={() => {
                deletePublish(p.id);
                emitRevisionChanged();
                refresh();
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <button type="button" data-testid="revision-save" title="Publish this look — graph, sculpt, grid, playhead" onClick={saveLook}>
        Save look
      </button>
    </div>
  );
}
