/**
 * VEC-701 — one vector projection transaction per mounted Gasper SVG root.
 *
 * This protocol does not own the organism clock or pose resolution. It grants
 * one final SVG writer lease, guards one complete projection callback, and
 * emits one inspection revision for each committed frame.
 */

export type GasperProjectionWriterId =
  | "formmaster-vector-projector"
  | "native-vector-projector";

export type GasperProjectionMode = "production" | "native-lab" | "standalone";

export type GasperProjectionFrame = {
  frameIndex: number;
  timeMs: number;
  resolvedHash: string;
  changedWrites?: number;
};

export type GasperProjectionFault = {
  writerId: string;
  frameIndex: number;
  message: string;
};

export type GasperProjectionInspection = {
  version: "1";
  packet: "VEC-701";
  authorityId: string;
  writerId: string;
  mode: GasperProjectionMode;
  rootId: string;
  revision: number;
  lastFrameIndex: number;
  lastTimeMs: number;
  lastResolvedHash: string | null;
  lastChangedWrites: number;
  activeTransaction: boolean;
  leaseCount: number;
  fault: GasperProjectionFault | null;
};

export type GasperProjectionCommit<T> = {
  value: T;
  inspection: GasperProjectionInspection;
};

export type GasperVectorProjectionLease = {
  readonly version: "1";
  readonly packet: "VEC-701";
  readonly writerId: string;
  readonly mode: GasperProjectionMode;
  transact<T>(
    frame: GasperProjectionFrame,
    project: () => T,
  ): GasperProjectionCommit<T>;
  inspect(): GasperProjectionInspection;
  dispose(): void;
};

export type GasperVectorProjectionAuthorityPort = {
  readonly version: "1";
  readonly packet: "VEC-701";
  readonly authorityId: string;
  claim(
    root: SVGSVGElement,
    writerId: string,
    mode: GasperProjectionMode,
  ): GasperVectorProjectionLease;
  inspect(root: SVGSVGElement): GasperProjectionInspection | null;
  hasWriter(root: SVGSVGElement, writerId?: string): boolean;
};

type RootState = {
  root: SVGSVGElement;
  rootId: string;
  writerId: string;
  mode: GasperProjectionMode;
  revision: number;
  lastFrameIndex: number;
  lastTimeMs: number;
  lastResolvedHash: string | null;
  lastChangedWrites: number;
  activeTransaction: boolean;
  leaseCount: number;
  fault: GasperProjectionFault | null;
};

const GLOBAL_KEY = "__GASPER_VECTOR_PROJECTION__" as const;
const REQUIRED_METHODS = ["claim", "inspect", "hasWriter"] as const;

function normalizeWriterId(writerId: string): string {
  const id = String(writerId ?? "").trim();
  if (!id) throw new TypeError("Gasper projection writer id is required");
  return id;
}

function isSvgRoot(value: unknown): value is SVGSVGElement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    getAttribute?: unknown;
    querySelector?: unknown;
    setAttribute?: unknown;
    nodeName?: unknown;
  };
  const hasAttributeContract =
    typeof candidate.getAttribute === "function" &&
    typeof candidate.setAttribute === "function";
  const hasStructuralProbeContract =
    typeof candidate.querySelector === "function" &&
    typeof candidate.setAttribute === "function";
  if (!hasAttributeContract && !hasStructuralProbeContract) return false;

  // SVGSVGElement is realm-local. Packaged WebView2, browser extensions, and
  // structural/runtime harnesses can hand us an SVG node from another realm,
  // or no constructor at all. Prefer the native check when available, then
  // fall back to the minimal DOM contract this authority actually uses.
  const ctor = (globalThis as { SVGSVGElement?: unknown }).SVGSVGElement;
  if (
    typeof ctor === "function" &&
    value instanceof (ctor as abstract new (...args: never[]) => object)
  ) {
    return true;
  }
  // Structural fallback remains active even when the local realm has a native
  // constructor: iframe, jsdom, and probe SVG roots are not instanceof it.
  const nodeName = String(candidate.nodeName ?? "").trim().toLowerCase();
  return !nodeName || nodeName === "svg";
}

function rootIdentity(root: SVGSVGElement): string {
  const getAttribute =
    typeof root.getAttribute === "function"
      ? root.getAttribute.bind(root)
      : (_name: string) => null;
  return (
    getAttribute("data-gasper-root-id") ||
    root.id ||
    getAttribute("aria-label") ||
    "gasper-svg-root"
  );
}

function immutableInspection(
  authorityId: string,
  state: RootState,
): GasperProjectionInspection {
  return Object.freeze({
    version: "1" as const,
    packet: "VEC-701" as const,
    authorityId,
    writerId: state.writerId,
    mode: state.mode,
    rootId: state.rootId,
    revision: state.revision,
    lastFrameIndex: state.lastFrameIndex,
    lastTimeMs: state.lastTimeMs,
    lastResolvedHash: state.lastResolvedHash,
    lastChangedWrites: state.lastChangedWrites,
    activeTransaction: state.activeTransaction,
    leaseCount: state.leaseCount,
    fault: state.fault ? Object.freeze({ ...state.fault }) : null,
  });
}

export function isGasperVectorProjectionAuthorityPort(
  value: unknown,
): value is GasperVectorProjectionAuthorityPort {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GasperVectorProjectionAuthorityPort>;
  return (
    candidate.version === "1" &&
    candidate.packet === "VEC-701" &&
    typeof candidate.authorityId === "string" &&
    REQUIRED_METHODS.every(
      (method) => typeof candidate[method] === "function",
    )
  );
}

export class GasperVectorProjectionAuthority
  implements GasperVectorProjectionAuthorityPort
{
  readonly version = "1" as const;
  readonly packet = "VEC-701" as const;
  readonly authorityId: string;

  private readonly roots = new WeakMap<SVGSVGElement, RootState>();

  constructor(authorityId = "typed-gasper-vector-projection") {
    this.authorityId = authorityId;
  }

  claim(
    root: SVGSVGElement,
    writerId: string,
    mode: GasperProjectionMode,
  ): GasperVectorProjectionLease {
    if (!isSvgRoot(root)) {
      throw new TypeError("Gasper projection requires an SVGSVGElement root");
    }
    const normalizedWriter = normalizeWriterId(writerId);
    let state = this.roots.get(root);
    if (state && state.writerId !== normalizedWriter) {
      throw new Error(
        `Gasper projection split-brain refused for ${state.rootId}: ` +
          `${state.writerId} already owns the root; ${normalizedWriter} requested it`,
      );
    }
    if (state && state.mode !== mode) {
      throw new Error(
        `Gasper projection mode mismatch for ${state.rootId}: ` +
          `${state.mode} already installed; ${mode} requested`,
      );
    }
    if (state && state.leaseCount > 0) {
      throw new Error(
        `Gasper projection duplicate active lease refused for ${state.rootId}: ` +
          `${normalizedWriter} already owns the root`,
      );
    }
    if (!state) {
      state = {
        root,
        rootId: rootIdentity(root),
        writerId: normalizedWriter,
        mode,
        revision: 0,
        lastFrameIndex: -1,
        lastTimeMs: 0,
        lastResolvedHash: null,
        lastChangedWrites: 0,
        activeTransaction: false,
        leaseCount: 0,
        fault: null,
      };
      this.roots.set(root, state);
    }
    state.leaseCount += 1;
    let active = true;

    return Object.freeze({
      version: "1" as const,
      packet: "VEC-701" as const,
      writerId: normalizedWriter,
      mode,
      transact: <T>(
        frame: GasperProjectionFrame,
        project: () => T,
      ): GasperProjectionCommit<T> => {
        if (!active) throw new Error("Gasper projection lease is disposed");
        const current = this.roots.get(root);
        if (!current || current !== state) {
          throw new Error("Gasper projection lease lost root authority");
        }
        if (current.writerId !== normalizedWriter) {
          throw new Error("Gasper projection writer authority changed");
        }
        if (current.fault) {
          throw new Error(
            `Gasper projection is faulted: ${current.fault.message}`,
          );
        }
        if (current.activeTransaction) {
          throw new Error("Gasper projection reentrant transaction refused");
        }
        const frameIndex = Number(frame?.frameIndex);
        const timeMs = Number(frame?.timeMs);
        const resolvedHash = String(frame?.resolvedHash ?? "").trim();
        if (!Number.isInteger(frameIndex) || frameIndex < 0) {
          throw new TypeError("Gasper projection frameIndex must be a uint-like integer");
        }
        if (!Number.isFinite(timeMs) || timeMs < 0) {
          throw new TypeError("Gasper projection timeMs must be finite and non-negative");
        }
        if (!resolvedHash) {
          throw new TypeError("Gasper projection resolvedHash is required");
        }
        if (frameIndex <= current.lastFrameIndex) {
          throw new Error(
            `Gasper projection duplicate/stale frame refused: ${frameIndex} <= ${current.lastFrameIndex}`,
          );
        }
        current.activeTransaction = true;
        try {
          const value = project();
          current.revision += 1;
          current.lastFrameIndex = frameIndex;
          current.lastTimeMs = timeMs;
          current.lastResolvedHash = resolvedHash;
          current.lastChangedWrites = Math.max(
            0,
            Math.trunc(Number(frame.changedWrites) || 0),
          );
          return Object.freeze({
            value,
            inspection: immutableInspection(this.authorityId, current),
          });
        } catch (error) {
          current.fault = Object.freeze({
            writerId: normalizedWriter,
            frameIndex,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        } finally {
          current.activeTransaction = false;
        }
      },
      inspect: () => immutableInspection(this.authorityId, state!),
      dispose: () => {
        if (!active) return;
        active = false;
        const current = this.roots.get(root);
        if (!current || current !== state) return;
        current.leaseCount = Math.max(0, current.leaseCount - 1);
        if (current.leaseCount === 0 && !current.activeTransaction) {
          this.roots.delete(root);
        }
      },
    });
  }

  inspect(root: SVGSVGElement): GasperProjectionInspection | null {
    const state = this.roots.get(root);
    return state ? immutableInspection(this.authorityId, state) : null;
  }

  hasWriter(root: SVGSVGElement, writerId?: string): boolean {
    const state = this.roots.get(root);
    if (!state) return false;
    return writerId === undefined
      ? true
      : state.writerId === normalizeWriterId(writerId);
  }
}

function globalPort(): unknown {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY];
}

export function installGasperVectorProjectionAuthority(
  authority: GasperVectorProjectionAuthorityPort,
): GasperVectorProjectionAuthorityPort {
  if (!isGasperVectorProjectionAuthorityPort(authority)) {
    throw new TypeError("Incompatible Gasper vector projection authority");
  }
  const existing = globalPort();
  if (existing !== undefined && existing !== authority) {
    if (!isGasperVectorProjectionAuthorityPort(existing)) {
      throw new Error("Incompatible global Gasper vector projection authority");
    }
    throw new Error("Gasper vector projection split-brain installation refused");
  }
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = authority;
  return authority;
}

export function getGasperVectorProjectionAuthority(): GasperVectorProjectionAuthorityPort {
  const existing = globalPort();
  if (existing !== undefined) {
    if (!isGasperVectorProjectionAuthorityPort(existing)) {
      throw new Error("Incompatible global Gasper vector projection authority");
    }
    return existing;
  }
  return installGasperVectorProjectionAuthority(
    new GasperVectorProjectionAuthority(),
  );
}

export function resetGasperVectorProjectionAuthorityForTests(): void {
  delete (globalThis as Record<string, unknown>)[GLOBAL_KEY];
}
