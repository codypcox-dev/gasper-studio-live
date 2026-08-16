/**
 * Multi-frame continuity recorder — ordered capture for analysis.
 */

import {
  CONTOUR_CHANNELS,
  TOPOLOGY_LOCK,
  type ContourChannel,
} from "./channels";
import type {
  ContinuityFrame,
  ContinuityChannelMap,
  ContinuityOwner,
  ContourSnapshot,
  TopologySnapshot,
} from "./types";

export function defaultTopology(): TopologySnapshot {
  return {
    contourSamples: TOPOLOGY_LOCK.contourSamples,
    structuralNodes: TOPOLOGY_LOCK.structuralNodes,
    structuralTriangles: TOPOLOGY_LOCK.structuralTriangles,
    topologyStable: TOPOLOGY_LOCK.topologyStable,
  };
}

export function contourFromChannels(
  channels: ContinuityChannelMap,
): ContourSnapshot {
  const g = (k: ContourChannel) => channels[k] ?? 0;
  return {
    overall_height: g("overall_height"),
    overall_width: g("overall_width"),
    crown_height: g("crown_height"),
    ground_flattening: g("ground_flattening"),
    lower_body_fullness: g("lower_body_fullness"),
  };
}

export class FrameSequenceRecorder {
  private frames: ContinuityFrame[] = [];
  private started = false;
  readonly seed: number;
  readonly dt: number;

  constructor(opts: { seed: number; dt?: number }) {
    this.seed = opts.seed >>> 0;
    this.dt = opts.dt ?? 1 / 60;
  }

  start(): void {
    this.frames = [];
    this.started = true;
  }

  get isRecording(): boolean {
    return this.started;
  }

  get frameCount(): number {
    return this.frames.length;
  }

  /** Append one ordered frame (t defaults to index * dt). */
  push(input: {
    channels: ContinuityChannelMap;
    ownership?: Record<string, ContinuityOwner>;
    topology?: TopologySnapshot;
    transition?: ContinuityFrame["transition"];
    interruptEdge?: boolean;
    t?: number;
  }): ContinuityFrame {
    if (!this.started) this.start();
    const index = this.frames.length;
    const t = input.t ?? Number((index * this.dt).toFixed(9));
    const channels = { ...input.channels };
    const frame: ContinuityFrame = {
      index,
      t,
      channels,
      ownership: { ...(input.ownership ?? {}) },
      topology: input.topology ?? defaultTopology(),
      contour: contourFromChannels(channels),
      transition: input.transition,
      interruptEdge: input.interruptEdge === true,
    };
    this.frames.push(frame);
    return frame;
  }

  snapshot(): ContinuityFrame[] {
    return this.frames.map((f) => ({
      ...f,
      channels: { ...f.channels },
      ownership: { ...f.ownership },
      topology: { ...f.topology },
      contour: { ...f.contour },
      transition: f.transition ? { ...f.transition } : undefined,
    }));
  }

  clear(): void {
    this.frames = [];
    this.started = false;
  }

  /** Ensure contour keys exist on a channel map (zeros if missing). */
  static ensureContourKeys(channels: ContinuityChannelMap): ContinuityChannelMap {
    const out = { ...channels };
    for (const k of CONTOUR_CHANNELS) {
      if (out[k] === undefined) out[k] = 0;
    }
    return out;
  }
}
