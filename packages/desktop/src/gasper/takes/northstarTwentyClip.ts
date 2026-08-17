import type { AnimationClip } from "../GasperAnimationTypes";
import { NORTHSTAR_TWENTY_TAKE, NORTHSTAR_TWENTY_TAKE_ID } from "./NorthstarTwentyTake";

/** Shelf entry for the document. Markers only — no GSAP form tracks. */
export function buildNorthstarTwentyClip(): AnimationClip {
  const t = new Date().toISOString();
  return {
    id: NORTHSTAR_TWENTY_TAKE_ID,
    name: NORTHSTAR_TWENTY_TAKE.name,
    duration_ms: Math.round(NORTHSTAR_TWENTY_TAKE.durationSec * 1000),
    loop_mode: "none",
    family: "gasper.take.v1",
    content_hash: NORTHSTAR_TWENTY_TAKE_ID,
    tracks: [],
    markers: NORTHSTAR_TWENTY_TAKE.beats.map((beat) => ({
      id: `mk-${beat.id}`,
      time_ms: Math.round(beat.at * 1000),
      label: beat.id,
    })),
    revision: 1,
    created_at: t,
    modified_at: t,
  };
}
