/** Comparison lab — each mode is a separate runtime, independently mutable. */

export type StudioModeId = "vector" | "hybrid";

export type RuntimeId = "formmaster-svg" | "three-webgl";

export type EnvironmentSpec = {
  id: StudioModeId;
  label: string;
  runtime: RuntimeId;
  bodyWriter: string;
  tools: string[];
};

export const ENVIRONMENTS: Record<StudioModeId, EnvironmentSpec> = {
  vector: {
    id: "vector",
    label: "Vector",
    runtime: "formmaster-svg",
    bodyWriter: "#body FormMaster 512",
    tools: ["look", "adobe-orbit", "desk"],
  },
  hybrid: {
    id: "hybrid",
    label: "vWebGL",
    runtime: "three-webgl",
    bodyWriter: "THREE.Mesh",
    tools: ["orbit", "lights", "material", "spin"],
  },
};

export const MODE_STORAGE_KEY = "gasper.studio.mode";

export function readStoredMode(): StudioModeId {
  try {
    const v = localStorage.getItem(MODE_STORAGE_KEY);
    if (v === "vector" || v === "hybrid") return v;
  } catch {
    /* */
  }
  return "vector";
}

export function writeStoredMode(id: StudioModeId): void {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, id);
  } catch {
    /* */
  }
  const g = globalThis as {
    __GASPER_STUDIO_MODE__?: StudioModeId;
    __GASPER_RUNTIME__?: RuntimeId;
  };
  g.__GASPER_STUDIO_MODE__ = id;
  g.__GASPER_RUNTIME__ = ENVIRONMENTS[id].runtime;
  try {
    document.documentElement.dataset.gasperMode = id;
    document.documentElement.dataset.gasperRuntime = ENVIRONMENTS[id].runtime;
  } catch {
    /* */
  }
}
