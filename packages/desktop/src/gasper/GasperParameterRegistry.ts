/**
 * Explicit binding contract: every visible control has one binding.
 * Hot path: preview() must not touch REST/MCP/CDP/iframe/postMessage.
 */

export interface GasperRigBinding {
  id: string;
  label: string;
  group: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  read(): number;
  preview(value: number): void;
  commit(value: number): void;
  cancel(): void;
  reset(): void;
  affectedNodeIds: string[];
  validEmbodiments: string[];
}

export type BindingDiagnostic = {
  id: string;
  ok: boolean;
  message: string;
};

export class GasperParameterRegistry {
  private bindings = new Map<string, GasperRigBinding>();
  private diagnostics = new Map<string, BindingDiagnostic>();
  private undoStack: Array<{ id: string; from: number; to: number }> = [];
  private redoStack: Array<{ id: string; from: number; to: number }> = [];

  register(b: GasperRigBinding) {
    this.bindings.set(b.id, b);
    this.diagnostics.set(b.id, { id: b.id, ok: true, message: "ok" });
  }

  get(id: string): GasperRigBinding | undefined {
    return this.bindings.get(id);
  }

  all(): GasperRigBinding[] {
    return [...this.bindings.values()];
  }

  ids(): string[] {
    return [...this.bindings.keys()].sort();
  }

  diagnostic(id: string): BindingDiagnostic | undefined {
    return this.diagnostics.get(id);
  }

  setDiagnostic(id: string, ok: boolean, message: string) {
    this.diagnostics.set(id, { id, ok, message });
  }

  /**
   * Gate: visible control ids must equal registered bindings.
   * Returns missing / extra sets.
   */
  assertVisibleEqualsRegistered(visibleControlIds: string[]): {
    ok: boolean;
    missing: string[];
    extra: string[];
  } {
    const vis = new Set(visibleControlIds);
    const reg = new Set(this.ids());
    const missing = [...vis].filter((id) => !reg.has(id)).sort();
    const extra = [...reg].filter((id) => !vis.has(id)).sort();
    return { ok: missing.length === 0 && extra.length === 0, missing, extra };
  }

  pushUndo(id: string, from: number, to: number) {
    this.undoStack.push({ id, from, to });
    this.redoStack = [];
  }

  undo(): boolean {
    const rec = this.undoStack.pop();
    if (!rec) return false;
    const b = this.bindings.get(rec.id);
    if (!b) return false;
    b.commit(rec.from);
    this.redoStack.push(rec);
    return true;
  }

  redo(): boolean {
    const rec = this.redoStack.pop();
    if (!rec) return false;
    const b = this.bindings.get(rec.id);
    if (!b) return false;
    b.commit(rec.to);
    this.undoStack.push(rec);
    return true;
  }

  serialize(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const b of this.bindings.values()) out[b.id] = b.read();
    return out;
  }
}
