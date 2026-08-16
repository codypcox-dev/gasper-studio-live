import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";

export function Navigator({
  snap,
  adapter,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
}) {
  const compact = snap.diagnostics.layoutMode === "compact";
  return (
    <aside className="gwc-panel" data-testid="gwc-navigator" aria-label="Navigator">
      <div className="gwc-panel-head">
        <span>{compact ? "Nav" : "Navigator"}</span>
      </div>
      <div className="gwc-panel-body" role="listbox" aria-label="Scene objects">
        {snap.navigator.length === 0 ? (
          <div className="gwc-empty" style={{ height: "auto", padding: 12 }}>
            <strong>Empty</strong>
            <span>No objects in scene</span>
          </div>
        ) : (
          snap.navigator.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              className="gwc-nav-item"
              data-kind={item.kind}
              data-nav-id={item.id}
              data-nav-item="true"
              data-testid={`gwc-nav-${item.id}`}
              aria-selected={snap.selectedNavigatorId === item.id}
              aria-label={item.label}
              style={{ paddingLeft: 8 + (item.depth ?? 0) * 12 }}
              onClick={() => adapter.selectNavigatorItem(item.id)}
            >
              <span className="gwc-nav-kind" aria-hidden />
              <span>{item.label}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
