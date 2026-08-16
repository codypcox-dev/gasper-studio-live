/**
 * S5 · E-LAW (expression-attention-phd-memo) — whole-body affect coupling.
 *
 * The wall (D-0116): the compiled emotion-peak carrier (physFaceEnergy,
 * D-0096) died at the face plane — mouth, cheeks, eyes moved while the
 * silhouette stayed rigid. A smile on a statue. The Boo deconstruction
 * (ghost-flight-reference-brief C6) names the read: emotion is whole-body;
 * the face never acts alone.
 *
 * E-LAW 1 (amplitude): affect reads as EXTENSION (the laugh idiom). The
 * vertical stretch earns the GOLDEN CUT of the R3 contact-squash fence —
 * what impact earns at 5 %, affect earns at 5 %/φ — with the horizontal
 * scale as the exact volume conjugate (Sx·Sy = 1: the volume-law hard gate
 * holds with equality). The stretch is BASE-ANCHORED (a buoyant body extends
 * upward; the floor contact never sinks) and carries a slight equatorial
 * rock on the lean channel, sized at the golden cut of the 8 px no-pinch
 * fence, signed away from the addressed direction.
 *
 * E-LAW 2 (timing): the face leads; the body follows at τ = τ_c·φ — the
 * bank response idiom (one response law for the lean, the surface, and the
 * affect). The lagged carrier feeds ONLY the body channels; the face fold
 * keeps the raw carrier (D-0096 timing untouched). Reduced motion collapses
 * the carrier; at rest every channel is zero = byte-identical (D-0088).
 *
 * Integration idiom (gait-expression-phd-memo L9): the law rides the
 * EXISTING fixture pose channels (postureScaleX/Y, postureY, bodyLean) —
 * additive, gated, one law for every embodiment.
 */

import { GAIT_LAW } from "../physics/GaitLaw";
import { PHI } from "../physics/PhiLaw";

/** The contact-squash fence (R3, walk-weight-transfer-phd-memo) — T3 family ceiling. */
const CONTACT_SQUASH_FENCE = 0.05;
/** The no-pinch fence (D-0059) on measured per-vertex delta (content px). */
const NO_PINCH_FENCE_PX = 8;
/** Form half-height for the presence family (content px; formProjectionFrame ry). */
const FORM_HALF_HEIGHT_PX = 84;

export const EXPRESSION_LAW = Object.freeze({
  /**
   * E-LAW 1 — peak vertical stretch fraction: the golden cut of the R3
   * contact-squash fence (5 %/φ ≈ 3.09 %). Impact earns the fence; affect
   * earns its golden cut — slight, the owner's idiom.
   */
  stretchMaxFrac: CONTACT_SQUASH_FENCE / PHI,
  /**
   * E-LAW 1 — peak equatorial rock on the lean channel (content px): the
   * golden cut of the 8 px no-pinch fence (8/φ² ≈ 3.06 px).
   */
  leanMaxPx: NO_PINCH_FENCE_PX / (PHI * PHI),
  /** E-LAW 1 — base-anchored rise arm = form half-height (content px). */
  baseArmPx: FORM_HALF_HEIGHT_PX,
  /**
   * E-LAW 2 — the body follows the face at τ = τ_c·φ (the bank idiom;
   * GAIT_LAW.bankSmoothTauSec IS τ_c·φ).
   */
  bodyTauSec: GAIT_LAW.bankSmoothTauSec,
});

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

export type ExpressionStretch = Readonly<{
  /** Vertical scale 1 + ε. */
  scaleY: number;
  /** Horizontal scale 1/(1 + ε) — the exact volume conjugate. */
  scaleX: number;
  /** Base-anchored rise (content px) — subtract from postureY. */
  risePx: number;
}>;

/**
 * E-LAW 1 projection: the silhouette stretch for a lagged body carrier
 * value fe_body ∈ [0,1]. The volume product is exactly 1 by construction
 * (the volume-law hard gate holds with equality); fail-closed on corrupt
 * input (non-finite reads as rest = identity).
 */
export function expressionStretchFor(feBody: number): ExpressionStretch {
  const eps = EXPRESSION_LAW.stretchMaxFrac * clamp01(feBody);
  return Object.freeze({
    scaleY: 1 + eps,
    scaleX: 1 / (1 + eps),
    risePx: eps * EXPRESSION_LAW.baseArmPx,
  });
}

/**
 * E-LAW 1 — the equatorial rock (content px) for a carrier value + the
 * signed attention yaw (live, degrees). The rock signs AWAY from the
 * addressed direction; frontal (|yaw| ≤ 0.5°) keeps the +1 default.
 */
export function expressionRockPx(feBody: number, attentionYawDeg: number): number {
  const yaw = Number.isFinite(attentionYawDeg) ? attentionYawDeg : 0;
  const sign = yaw > 0.5 ? -1 : 1;
  const amp = EXPRESSION_LAW.leanMaxPx * clamp01(feBody);
  return amp === 0 ? 0 : sign * amp; // exact +0 at rest (no −0)
}
