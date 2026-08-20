import type { StudioModeId } from "./registry";

const TABS: { id: StudioModeId; label: string }[] = [
  { id: "vector", label: "Vector" },
  { id: "hybrid", label: "vWebGL" },
];

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: StudioModeId;
  onChange: (id: StudioModeId) => void;
}) {
  return (
    <div
      className="gasper-mode-toggle"
      data-testid="gasper-mode-toggle"
      role="tablist"
      aria-label="Body renderer"
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={mode === t.id}
          data-testid={`mode-${t.id}`}
          data-active={mode === t.id ? "1" : "0"}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
