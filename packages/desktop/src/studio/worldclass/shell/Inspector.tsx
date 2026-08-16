import { useMemo, useState } from "react";
import type {
  InspectorRow,
  WorldClassStudioAdapter,
  WorldClassStudioSnapshot,
} from "../adapter/types";

export function Inspector({
  snap,
  adapter,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!q) return snap.inspectorGroups;
    return snap.inspectorGroups
      .map((g) => ({
        ...g,
        rows: g.rows.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q) ||
            g.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.rows.length > 0 || g.label.toLowerCase().includes(q));
  }, [snap.inspectorGroups, q]);

  return (
    <aside className="gwc-panel gwc-panel-inspector" data-testid="gwc-inspector" aria-label="Inspector">
      <div className="gwc-panel-head">
        <span>Inspector</span>
      </div>
      <div className="gwc-panel-body">
        <label className="gwc-insp-search" data-testid="gwc-insp-search">
          <span className="gwc-sr-only">Search properties</span>
          <input
            type="search"
            placeholder="Search properties…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="gwc-insp-search-input"
            aria-label="Search properties"
          />
        </label>

        {snap.inspectorGroups.length === 0 ? (
          <div className="gwc-empty" style={{ height: "auto", padding: 12 }}>
            <strong>No properties</strong>
            <span>Select an object to inspect</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="gwc-empty" style={{ height: "auto", padding: 12 }} data-testid="gwc-insp-no-match">
            <strong>No matches</strong>
            <span>No properties match “{query}”</span>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <details
              key={group.id}
              className="gwc-disclosure"
              open={q ? true : group.open}
              data-testid={`gwc-insp-group-${group.id}`}
              onToggle={(e) => {
                if (q) return;
                const open = (e.currentTarget as HTMLDetailsElement).open;
                if (open !== group.open) adapter.toggleInspectorGroup(group.id);
              }}
            >
              <summary data-testid={`gwc-insp-summary-${group.id}`}>{group.label}</summary>
              <div className="gwc-disclosure-body">
                {group.rows.map((row) => (
                  <InspectorControl
                    key={row.id}
                    groupId={group.id}
                    row={row}
                    adapter={adapter}
                  />
                ))}
              </div>
            </details>
          ))
        )}
      </div>
    </aside>
  );
}

function InspectorControl({
  groupId,
  row,
  adapter,
}: {
  groupId: string;
  row: InspectorRow;
  adapter: WorldClassStudioAdapter;
}) {
  const control = row.control ?? (typeof row.value === "boolean" ? "toggle" : "text");
  const disabled = Boolean(row.readOnly || row.unavailable || !adapter.setInspectorValue);
  const unavailable = Boolean(row.unavailable);

  const commit = (value: string | number | boolean) => {
    if (disabled) return;
    adapter.setInspectorValue?.(groupId, row.id, value);
  };

  return (
    <div
      className="gwc-insp-row"
      data-testid={`gwc-insp-row-${row.id}`}
      data-control={control}
      data-readonly={row.readOnly ? "true" : "false"}
      data-unavailable={unavailable ? "true" : "false"}
      title={unavailable ? row.unavailableReason ?? "Unavailable" : undefined}
    >
      <span className="gwc-insp-label">{row.label}</span>
      <div className="gwc-insp-control">
        {unavailable ? (
          <span className="gwc-insp-unavailable" data-testid={`gwc-insp-unavail-${row.id}`}>
            Unavailable
          </span>
        ) : control === "toggle" ? (
          <button
            type="button"
            className="gwc-btn gwc-btn-ghost"
            role="switch"
            aria-checked={Boolean(row.value)}
            disabled={disabled}
            data-testid={`gwc-insp-toggle-${row.id}`}
            onClick={() => commit(!Boolean(row.value))}
          >
            {row.value ? "On" : "Off"}
          </button>
        ) : control === "slider" ? (
          <div className="gwc-insp-slider">
            <input
              type="range"
              min={row.min ?? 0}
              max={row.max ?? 1}
              step={row.step ?? 0.01}
              value={typeof row.value === "number" ? row.value : Number(row.value) || 0}
              disabled={disabled}
              data-testid={`gwc-insp-slider-${row.id}`}
              onChange={(e) => commit(Number(e.target.value))}
              aria-label={row.label}
            />
            <span className="gwc-insp-num" data-testid={`gwc-insp-val-${row.id}`}>
              {typeof row.value === "number" ? row.value.toFixed(2) : String(row.value)}
              {row.unit ? ` ${row.unit}` : ""}
            </span>
          </div>
        ) : control === "number" ? (
          <input
            type="number"
            className="gwc-insp-number"
            min={row.min}
            max={row.max}
            step={row.step ?? 1}
            value={typeof row.value === "number" ? row.value : Number(row.value) || 0}
            disabled={disabled}
            readOnly={row.readOnly}
            data-testid={`gwc-insp-number-${row.id}`}
            onChange={(e) => commit(Number(e.target.value))}
            aria-label={row.label}
          />
        ) : control === "select" ? (
          <select
            className="gwc-insp-select"
            value={String(row.value)}
            disabled={disabled}
            data-testid={`gwc-insp-select-${row.id}`}
            onChange={(e) => commit(e.target.value)}
            aria-label={row.label}
          >
            {(row.options ?? [{ value: String(row.value), label: String(row.value) }]).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className="gwc-insp-text"
            value={String(row.value)}
            disabled={disabled}
            readOnly={row.readOnly || !adapter.setInspectorValue}
            data-testid={`gwc-insp-text-${row.id}`}
            onChange={(e) => commit(e.target.value)}
            aria-label={row.label}
          />
        )}
      </div>
    </div>
  );
}
