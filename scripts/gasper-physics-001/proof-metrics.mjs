const HOME_VIEW_DISTANCE = 1920;
const UNITS_PER_CONTENT_PX = 8;
const FLOOR_TO_HORIZON_PX = 78;
const NUMBER = "[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[-+]?\\d+)?";

const finiteOr = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

/**
 * Hand-mirrors the visible worldRig projection law for proof comparison.
 * Renderer telemetry already contains gait values after their motion gate, so
 * this helper intentionally does not re-run gait or physics logic.
 */
export function expectedWorldRigProjection({ pose, dataset } = {}) {
  const applied = pose?.applied ?? pose ?? {};
  const feeds = dataset ?? {};
  const x = finiteOr(applied.x);
  const z = finiteOr(applied.z);
  const tilt = finiteOr(applied.tilt);
  const scale = Number.isFinite(Number(feeds.worldDepthScale))
    ? Number(feeds.worldDepthScale)
    : HOME_VIEW_DISTANCE / (HOME_VIEW_DISTANCE + z);
  return {
    // N320/N325: sway and gait roll stay off worldRig. The floor/camera
    // stay level; only flight tilt rotates the world.
    translateX: (x / UNITS_PER_CONTENT_PX) * scale,
    translateY: -FLOOR_TO_HORIZON_PX * (1 - scale),
    scale,
    rotate: -tilt,
  };
}

const IDENTITY_AFFINE = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

function finiteAffine(matrix) {
  if (!matrix || typeof matrix !== "object") return null;
  const values = ["a", "b", "c", "d", "e", "f"].map((key) => Number(matrix[key]));
  if (!values.every(Number.isFinite)) return null;
  return Object.fromEntries(["a", "b", "c", "d", "e", "f"].map((key, index) => [key, values[index]]));
}

function multiplyAffine(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function translation(x, y) {
  return { ...IDENTITY_AFFINE, e: x, f: y };
}

function uniformScale(scale) {
  return { a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 };
}

function rotationDegrees(degrees) {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return { a: cosine, b: sine, c: -sine, d: cosine, e: 0, f: 0 };
}

function worldRigAffine(sample) {
  const expected = expectedWorldRigProjection(sample);
  let matrix = { ...IDENTITY_AFFINE };
  for (const next of [
    translation(expected.translateX, expected.translateY),
    translation(120, 190),
    uniformScale(expected.scale),
    // The production transform is rotate(angle 0 -45), not a rotation about
    // the origin. Preserve that exact SVG pivot in the screen witness.
    translation(0, -45),
    rotationDegrees(expected.rotate),
    translation(0, 45),
    translation(-120, -190),
  ]) {
    matrix = multiplyAffine(matrix, next);
  }
  return matrix;
}

/**
 * Compose the production world-rig matrix with the browser's actual SVG
 * screen CTM. This is the pixel-space counterpart to the string witness:
 * it proves the visible renderer transform, not merely its serialized feeds.
 */
export function expectedWorldRigScreenMatrix(sample, baseMatrix) {
  const base = finiteAffine(baseMatrix);
  return base ? multiplyAffine(base, worldRigAffine(sample)) : null;
}

function projectAffinePoint(matrix, point) {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

/** Compare the actual browser CTM and a fixed world anchor in screen pixels. */
export function screenProjectionResidual(
  sample,
  actualMatrix,
  baseMatrix,
  point = { x: 120, y: 190 },
  tolerances = {},
) {
  const actual = finiteAffine(actualMatrix);
  const expected = expectedWorldRigScreenMatrix(sample, baseMatrix);
  const anchor = {
    x: finiteOr(point?.x, 120),
    y: finiteOr(point?.y, 190),
  };
  if (!actual || !expected) {
    return {
      pass: false,
      maxResidual: Number.POSITIVE_INFINITY,
      residuals: null,
      expected,
      actual,
      expectedPoint: null,
      actualPoint: null,
    };
  }

  const residuals = {
    a: Math.abs(actual.a - expected.a),
    b: Math.abs(actual.b - expected.b),
    c: Math.abs(actual.c - expected.c),
    d: Math.abs(actual.d - expected.d),
    e: Math.abs(actual.e - expected.e),
    f: Math.abs(actual.f - expected.f),
  };
  const expectedPoint = projectAffinePoint(expected, anchor);
  const actualPoint = projectAffinePoint(actual, anchor);
  const pointResiduals = {
    x: Math.abs(actualPoint.x - expectedPoint.x),
    y: Math.abs(actualPoint.y - expectedPoint.y),
  };
  // The production transform rounds rotation to 0.01 degrees. Convert the
  // declared half-quantum at the renderer's fixed pivot into screen pixels;
  // the small additive margins cover the separately declared 0.001-unit
  // translation and 0.00001 depth-scale serializations.
  const screenScale = Math.max(Math.hypot(baseMatrix?.a ?? 1, baseMatrix?.b ?? 0), Math.hypot(baseMatrix?.c ?? 0, baseMatrix?.d ?? 1));
  const rotationQuantizationPx = (0.005 * Math.PI / 180) * Math.hypot(120, 235) * screenScale;
  const limits = {
    matrix: tolerances.matrix ?? rotationQuantizationPx + 0.01,
    point: tolerances.point ?? rotationQuantizationPx + 0.02,
  };
  const pass = Object.values(residuals).every((value) => value <= limits.matrix) &&
    Object.values(pointResiduals).every((value) => value <= limits.point);
  return {
    pass,
    maxResidual: Math.max(...Object.values(residuals), ...Object.values(pointResiduals)),
    residuals,
    pointResiduals,
    expected,
    actual,
    expectedPoint,
    actualPoint,
  };
}

/** Parse the exact transform family emitted by the production worldRig writer. */
export function parseWorldRigTransform(transform) {
  if (typeof transform !== "string") return null;
  const pattern = new RegExp(
    `^\\s*translate\\(\\s*(${NUMBER})\\s+(${NUMBER})\\s*\\)\\s+` +
      `translate\\(\\s*120\\s+190\\s*\\)\\s+` +
      `scale\\(\\s*(${NUMBER})\\s*\\)\\s+` +
      `rotate\\(\\s*(${NUMBER})\\s+0\\s+-45\\s*\\)\\s+` +
      `translate\\(\\s*-120\\s+-190\\s*\\)\\s*$`,
  );
  const match = transform.match(pattern);
  if (!match) return null;
  return {
    translateX: Number(match[1]),
    translateY: Number(match[2]),
    scale: Number(match[3]),
    rotate: Number(match[4]),
  };
}

/** Compare a captured DOM transform with the independently derived equation. */
export function projectionResidual(sample, transform, tolerances = {}) {
  const expected = expectedWorldRigProjection(sample);
  const actual = parseWorldRigTransform(transform);
  if (!actual) {
    return {
      pass: false,
      maxResidual: Number.POSITIVE_INFINITY,
      residuals: null,
      expected,
      actual: null,
    };
  }

  const residuals = {
    translateX: Math.abs(actual.translateX - expected.translateX),
    translateY: Math.abs(actual.translateY - expected.translateY),
    scale: Math.abs(actual.scale - expected.scale),
    rotate: Math.abs(actual.rotate - expected.rotate),
  };
  const limits = {
    // The renderer serializes lateral translation to 3 decimals while the
    // DOM gait witness is currently serialized to 2 decimals and depth to 5.
    // These limits cover that quantization, not arbitrary visual drift.
    translateX: tolerances.translateX ?? 0.0021,
    translateY: tolerances.translateY ?? 0.0011,
    scale: tolerances.scale ?? 0.000011,
    // worldRig rotation is serialized to 2 decimal places. The source gait
    // roll is itself serialized to 3 decimals before the renderer composes
    // that value, so allow half of each declared quantum plus float margin.
    rotate: tolerances.rotate ?? 0.0056,
  };
  const pass = Object.entries(residuals).every(
    ([key, value]) => value <= limits[key],
  );
  return {
    pass,
    maxResidual: Math.max(...Object.values(residuals)),
    residuals,
    expected,
    actual,
  };
}

/**
 * Find small repeating periods in decision-event timing. A sequence with no
 * repeated gap pattern is the useful aperiodic result for the witness.
 */
export function decisionTimingCensus(times, maxPeriod = 16) {
  const ordered = (Array.isArray(times) ? times : [])
    .map(Number)
    .filter(Number.isFinite);
  const gaps = ordered.slice(1).map((time, index) => time - ordered[index]);
  const periods = [];
  // A candidate period must have two complete cycles to be a meaningful
  // repetition. Letting period === gaps.length through makes the final loop
  // vacuous, classifying every finite sequence as periodic by construction.
  const limit = Math.min(maxPeriod, Math.floor(gaps.length / 2));
  const close = (a, b) => Math.abs(a - b) <= 1e-9;
  for (let period = 1; period <= limit; period += 1) {
    let repeats = true;
    for (let index = period; index < gaps.length; index += 1) {
      if (!close(gaps[index], gaps[index % period])) {
        repeats = false;
        break;
      }
    }
    if (repeats) periods.push(period);
  }
  return {
    eventCount: ordered.length,
    gapCount: gaps.length,
    gaps,
    uniqueGaps: [...new Set(gaps.map((gap) => Math.round(gap * 1e9) / 1e9))],
    periods,
    aperiodic: periods.length === 0,
  };
}

/**
 * Count material sign changes in a travel signal while ignoring the settling
 * band around zero. Showcase clips use this as a compact motion-quality gate:
 * a subject must actually change direction, not merely drift through a
 * boundary or jitter around rest.
 */
export function directionReversalCount(values, threshold = 0) {
  const epsilon = Number.isFinite(Number(threshold)) ? Math.max(0, Number(threshold)) : 0;
  let previousSign = 0;
  let reversals = 0;
  for (const raw of Array.isArray(values) ? values : []) {
    const value = Number(raw);
    if (!Number.isFinite(value) || Math.abs(value) <= epsilon) continue;
    const sign = Math.sign(value);
    if (previousSign !== 0 && sign !== previousSign) reversals += 1;
    previousSign = sign;
  }
  return reversals;
}

/**
 * Count direction reversals only when the new direction persists for a
 * declared number of source samples. This keeps an authored brake/reversal
 * visible while excluding sign chatter in the finite arrival band around a
 * settled target.
 */
export function sustainedDirectionReversalCount(values, threshold = 0, minRun = 2) {
  const epsilon = Number.isFinite(Number(threshold)) ? Math.max(0, Number(threshold)) : 0;
  const requiredRun = Number.isFinite(Number(minRun)) ? Math.max(1, Math.floor(Number(minRun))) : 1;
  let committedSign = 0;
  let committedRun = 0;
  let candidateSign = 0;
  let candidateRun = 0;
  let reversals = 0;

  for (const raw of Array.isArray(values) ? values : []) {
    const value = Number(raw);
    if (!Number.isFinite(value) || Math.abs(value) <= epsilon) {
      candidateSign = 0;
      candidateRun = 0;
      continue;
    }
    const sign = Math.sign(value);
    if (committedSign === 0) {
      committedSign = sign;
      committedRun = 1;
      continue;
    }
    if (sign === committedSign) {
      committedRun += 1;
      candidateSign = 0;
      candidateRun = 0;
      continue;
    }
    if (candidateSign === sign) candidateRun += 1;
    else {
      candidateSign = sign;
      candidateRun = 1;
    }
    if (committedRun >= requiredRun && candidateRun >= requiredRun) {
      reversals += 1;
      committedSign = sign;
      committedRun = candidateRun;
      candidateSign = 0;
      candidateRun = 0;
    }
  }
  return reversals;
}

/**
 * Prove that the coupled showcase hands the live walking body to Boo instead
 * of waiting for an idle/origin reset. The transition is intentionally
 * adjacent-sample: a clean visual handoff may change embodiment and physics
 * mode, but it may not discard the preceding grounded pose.
 */
export function northstarHandoffMetric(
  samples = [],
  { maxPositionDelta = 12 } = {},
) {
  const rows = Array.isArray(samples) ? samples : [];
  const transitionIndex = rows.findIndex((sample, index) =>
    index > 0 && sample?.embodiment === "presence" && rows[index - 1]?.embodiment === "wispwalker",
  );
  const from = transitionIndex > 0 ? rows[transitionIndex - 1] : null;
  const to = transitionIndex > 0 ? rows[transitionIndex] : null;
  const fromBody = from?.body?.body;
  const toBody = to?.body?.body;
  const positionDelta = fromBody && toBody &&
    ["x", "y", "z"].every((key) => Number.isFinite(Number(fromBody[key])) && Number.isFinite(Number(toBody[key])))
    ? Math.hypot(
      Number(toBody.x) - Number(fromBody.x),
      Number(toBody.y) - Number(fromBody.y),
      Number(toBody.z) - Number(fromBody.z),
    )
    : Number.POSITIVE_INFINITY;
  const fromMode = from?.body?.mode ?? null;
  const toMode = to?.body?.mode ?? null;
  const pass = Boolean(from && to) &&
    fromMode === "locomotion" &&
    fromBody?.contact === true &&
    ["comet-gather", "comet-fly"].includes(toMode) &&
    positionDelta <= maxPositionDelta;
  return {
    pass,
    transitionIndex: transitionIndex < 0 ? null : transitionIndex,
    fromMode,
    toMode,
    positionDelta: Number.isFinite(positionDelta) ? Math.round(positionDelta * 1e6) / 1e6 : null,
    thresholds: { maxPositionDelta },
  };
}

/**
 * Measure whether a rendered Wispwalker contour has a readable two-foot base.
 *
 * The capture harness supplies the lower envelope of the actual #body SVG
 * path, in left-to-right bins. A feet-form must put more mass below the left
 * and right root bands than at the center cleft; a generic pearl does the
 * opposite or remains effectively flat. This is intentionally a contour
 * witness, not a source-coefficient witness.
 */
export function wispwalkerFootReadabilityMetric({
  bottomY = [],
  widthPx = 0,
  minCleftDepthPx = 3.5,
  minFootSpreadPx = 24,
} = {}) {
  const values = (Array.isArray(bottomY) ? bottomY : [])
    .map(Number)
    .filter(Number.isFinite);
  const ordered = Array.isArray(bottomY)
    ? bottomY.map((value) => (Number.isFinite(Number(value)) ? Number(value) : null))
    : [];
  const finiteWidth = Number.isFinite(Number(widthPx)) ? Math.max(0, Number(widthPx)) : 0;
  const sampleAt = (fraction) => {
    if (ordered.length < 3) return null;
    const index = Math.max(0, Math.min(ordered.length - 1, Math.round(fraction * (ordered.length - 1))));
    return ordered[index];
  };
  const windowPeak = (startFraction, endFraction) => {
    if (ordered.length < 3) return { y: null, index: null };
    const start = Math.max(0, Math.floor(startFraction * (ordered.length - 1)));
    const end = Math.min(ordered.length - 1, Math.ceil(endFraction * (ordered.length - 1)));
    let y = null;
    let index = null;
    for (let i = start; i <= end; i += 1) {
      const candidate = ordered[i];
      if (candidate !== null && (y === null || candidate > y)) {
        y = candidate;
        index = i;
      }
    }
    return { y, index };
  };
  const left = windowPeak(0.28, 0.44);
  const right = windowPeak(0.56, 0.72);
  const centerY = sampleAt(0.5);
  const cleftDepthPx = left.y !== null && right.y !== null && centerY !== null
    ? ((left.y + right.y) / 2) - centerY
    : null;
  const footSpreadPx = left.index !== null && right.index !== null && ordered.length > 1
    ? ((right.index - left.index) / (ordered.length - 1)) * finiteWidth
    : null;
  const bilateralImbalancePx = left.y !== null && right.y !== null
    ? Math.abs(left.y - right.y)
    : null;
  const signedBilateralImbalancePx = left.y !== null && right.y !== null
    ? right.y - left.y
    : null;
  const pass = values.length >= 3 &&
    cleftDepthPx !== null && cleftDepthPx >= minCleftDepthPx &&
    footSpreadPx !== null && footSpreadPx >= minFootSpreadPx;
  return {
    pass,
    sampleCount: values.length,
    cleftDepthPx,
    footSpreadPx,
    bilateralImbalancePx,
    signedBilateralImbalancePx,
    leftFootY: left.y,
    rightFootY: right.y,
    centerCleftY: centerY,
    leftFootIndex: left.index,
    rightFootIndex: right.index,
    thresholds: { minCleftDepthPx, minFootSpreadPx },
  };
}

/**
 * Measure the thing the eye needs to see in a walking shot: the load-bearing
 * roots must exchange sides, not merely retain a static two-lobed outline.
 * The signal is taken from the rendered contour metric above, so a source
 * coefficient or physics telemetry value cannot pass this gate by itself.
 */
export function wispwalkerGaitMotionMetric(
  samples = [],
  { minImbalancePx = 1.5, minDirectionalRun = 6, minReversals = 2 } = {},
) {
  const rows = (Array.isArray(samples) ? samples : [])
    .map((sample) => {
      // Prefer the screen-transformed contour when the capture harness has
      // it. The local path is a fallback for unit tests and older receipts;
      // it cannot see the production stepRig skew that carries support load.
      const contour = sample?.renderedBodyContour ?? sample?.bodyContour;
      return wispwalkerFootReadabilityMetric({
        bottomY: contour?.bottomY,
        widthPx: contour?.bbox?.width,
      });
    })
    .filter((metric) => Number.isFinite(metric.signedBilateralImbalancePx));
  const active = rows.filter((metric) => Math.abs(metric.signedBilateralImbalancePx) >= minImbalancePx);
  const signal = active.map((metric) => metric.signedBilateralImbalancePx);
  const positiveRun = longestRun(signal, (value) => value >= minImbalancePx);
  const negativeRun = longestRun(signal, (value) => value <= -minImbalancePx);
  const reversals = directionReversalCount(signal, minImbalancePx);
  const positivePeak = signal.length ? Math.max(...signal) : 0;
  const negativeTrough = signal.length ? Math.min(...signal) : 0;
  return {
    pass: active.length >= minDirectionalRun * 2 &&
      positiveRun >= minDirectionalRun &&
      negativeRun >= minDirectionalRun &&
      reversals >= minReversals &&
      positivePeak >= minImbalancePx &&
      negativeTrough <= -minImbalancePx,
    sampleCount: rows.length,
    activeSampleCount: active.length,
    positiveRun,
    negativeRun,
    directionReversalCount: reversals,
    positivePeakPx: positivePeak,
    negativeTroughPx: negativeTrough,
    thresholds: { minImbalancePx, minDirectionalRun, minReversals },
  };
}

/**
 * Prove that the visible planted-support carrier stays coherent with the
 * physics-derived step and the floor-shadow exchange. This is intentionally a
 * coupled telemetry metric: nonzero channels alone are insufficient if they
 * disagree in sign or disappear during meaningful step motion.
 */
export function wispwalkerSupportCarrierMetric(
  samples = [],
  {
    minStepUnits = 0.5,
    minCarrierUnits = 0.01,
    minActiveSamples = 12,
    minCarrierFraction = 0.75,
    minSignAgreement = 0.8,
  } = {},
) {
  const rows = (Array.isArray(samples) ? samples : [])
    .map((sample) => ({
      contact: sample?.body?.body?.contact === true,
      mode: sample?.body?.mode ?? null,
      step: Number(sample?.dataset?.gaitStepX),
      flatten: Number(sample?.dataset?.gaitFlatten),
      flattenWidth: Number(sample?.dataset?.gaitFlattenW),
      shadow: Number(sample?.dataset?.gaitShadowDx),
    }))
    .filter((row) => row.contact && row.mode === "locomotion" &&
      [row.step, row.flatten, row.flattenWidth, row.shadow].every(Number.isFinite));
  const active = rows.filter((row) => Math.abs(row.step) >= minStepUnits);
  const carrier = active.filter((row) =>
    Math.max(Math.abs(row.flatten), Math.abs(row.flattenWidth)) >= minCarrierUnits,
  );
  const agreement = (key) => {
    const paired = active.filter((row) => Math.abs(row[key]) >= minCarrierUnits);
    return {
      count: paired.length,
      value: paired.length
        ? paired.filter((row) => Math.sign(row[key]) === Math.sign(row.step)).length / paired.length
        : 0,
    };
  };
  const flattenAgreement = agreement("flatten");
  const shadowAgreement = agreement("shadow");
  const flattenShadowPaired = active.filter((row) =>
    Math.abs(row.flatten) >= minCarrierUnits && Math.abs(row.shadow) >= minCarrierUnits,
  );
  const flattenShadowSignAgreement = flattenShadowPaired.length
    ? flattenShadowPaired.filter((row) => Math.sign(row.flatten) === Math.sign(row.shadow)).length /
      flattenShadowPaired.length
    : 0;
  const flattenSupportFraction = active.length ? carrier.length / active.length : 0;
  return {
    pass: active.length >= minActiveSamples &&
      flattenSupportFraction >= minCarrierFraction &&
      flattenAgreement.value >= minSignAgreement &&
      shadowAgreement.value >= minSignAgreement,
    sampleCount: rows.length,
    activeSampleCount: active.length,
    carrierSampleCount: carrier.length,
    flattenSupportFraction,
    flattenStepSignAgreement: flattenAgreement.value,
    flattenStepPairedSamples: flattenAgreement.count,
    shadowStepSignAgreement: shadowAgreement.value,
    shadowStepPairedSamples: shadowAgreement.count,
    flattenShadowSignAgreement,
    thresholds: {
      minStepUnits,
      minCarrierUnits,
      minActiveSamples,
      minCarrierFraction,
      minSignAgreement,
    },
  };
}

function longestRun(values, predicate) {
  let current = 0;
  let longest = 0;
  for (const value of Array.isArray(values) ? values : []) {
    if (predicate(value)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

/**
 * Require the live flight wind carrier to reach the rendered contour with the
 * correct left/right response. The capture harness supplies horizontal extent
 * asymmetry measured from the actual #body path against the authored 120px
 * contour center; centering on the live bbox would erase the wind signal.
 *
 * Some embodied forms (notably Wispwalker with structural foot roots) carry a
 * legitimate static left/right bias. Absolute sign checks alone can therefore
 * hide a real pressure response. The pressure-conditioned fallback compares
 * each direction's high-pressure asymmetry against its own low-pressure
 * baseline, while preserving the original sign gate for symmetric forms.
 */
export function windResistanceMetric(
  samples = [],
  { minPressure = 0.08, minDirection = 0.2, minResponsePx = 0.5, minDirectionalRun = 3 } = {},
) {
  const rows = (Array.isArray(samples) ? samples : [])
    .map((sample) => ({
      pressure: Number(sample?.dataset?.windPressure),
      direction: Number(sample?.dataset?.windDirX),
      asymmetry: Number(sample?.bodyContour?.horizontalExtent?.asymmetryPx),
    }))
    .filter((row) => Number.isFinite(row.pressure) && Number.isFinite(row.direction) && Number.isFinite(row.asymmetry));
  const active = rows.filter((row) => row.pressure >= minPressure && Math.abs(row.direction) >= minDirection);
  const positive = active.filter((row) => row.direction > 0);
  const negative = active.filter((row) => row.direction < 0);
  const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const positiveMeanAsymmetryPx = mean(positive.map((row) => row.asymmetry));
  const negativeMeanAsymmetryPx = mean(negative.map((row) => row.asymmetry));
  const maxPressure = rows.length ? Math.max(...rows.map((row) => row.pressure)) : 0;
  const maxAbsDirection = rows.length ? Math.max(...rows.map((row) => Math.abs(row.direction))) : 0;
  const positiveResponse = positive.filter((row) => row.asymmetry >= minResponsePx);
  const negativeResponse = negative.filter((row) => row.asymmetry <= -minResponsePx);
  const lowPressureCutoff = minPressure + (maxPressure - minPressure) * 0.25;
  const highPressureCutoff = minPressure + (maxPressure - minPressure) * 0.65;
  const positiveLowPressure = positive.filter((row) => row.pressure <= lowPressureCutoff);
  const positiveHighPressure = positive.filter((row) => row.pressure >= highPressureCutoff);
  const negativeLowPressure = negative.filter((row) => row.pressure <= lowPressureCutoff);
  const negativeHighPressure = negative.filter((row) => row.pressure >= highPressureCutoff);
  const positivePressureDeltaPx = positiveHighPressure.length && positiveLowPressure.length
    ? mean(positiveHighPressure.map((row) => row.asymmetry)) - mean(positiveLowPressure.map((row) => row.asymmetry))
    : null;
  const negativePressureDeltaPx = negativeHighPressure.length && negativeLowPressure.length
    ? mean(negativeHighPressure.map((row) => row.asymmetry)) - mean(negativeLowPressure.map((row) => row.asymmetry))
    : null;
  const pressureTrendPass = positiveHighPressure.length >= minDirectionalRun &&
    positiveLowPressure.length >= minDirectionalRun &&
    negativeHighPressure.length >= minDirectionalRun &&
    negativeLowPressure.length >= minDirectionalRun &&
    positivePressureDeltaPx >= minResponsePx &&
    negativePressureDeltaPx <= -minResponsePx;
  const directionalResponseSampleCount = pressureTrendPass
    ? positiveHighPressure.length + negativeHighPressure.length
    : positiveResponse.length + negativeResponse.length;
  const longestDirectionalRun = (source, predicate) => {
    let current = 0;
    let longest = 0;
    for (const row of source) {
      if (predicate(row)) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    return longest;
  };
  const positiveResponseRun = longestDirectionalRun(positive, (row) => row.asymmetry >= minResponsePx);
  const negativeResponseRun = longestDirectionalRun(negative, (row) => row.asymmetry <= -minResponsePx);
  const directionReversalCountValue = directionReversalCount(rows.map((row) => row.direction), minDirection);
  const pass = active.length >= 3 &&
    positive.length >= 1 &&
    negative.length >= 1 &&
    (pressureTrendPass || (
      positiveResponseRun >= minDirectionalRun &&
      negativeResponseRun >= minDirectionalRun &&
      Math.max(...positive.map((row) => row.asymmetry), Number.NEGATIVE_INFINITY) >= minResponsePx &&
      Math.min(...negative.map((row) => row.asymmetry), Number.POSITIVE_INFINITY) <= -minResponsePx
    )) &&
    directionReversalCountValue >= 1 &&
    directionalResponseSampleCount >= 3;
  return {
    pass,
    sampleCount: rows.length,
    activeSampleCount: active.length,
    maxPressure,
    maxAbsDirection,
    directionReversalCount: directionReversalCountValue,
    directionalResponseSampleCount,
    positiveResponseRun,
    negativeResponseRun,
    positivePressureDeltaPx,
    negativePressureDeltaPx,
    pressureTrendPass,
    positiveMaxAsymmetryPx: positive.length ? Math.max(...positive.map((row) => row.asymmetry)) : null,
    negativeMinAsymmetryPx: negative.length ? Math.min(...negative.map((row) => row.asymmetry)) : null,
    positiveMeanAsymmetryPx,
    negativeMeanAsymmetryPx,
    thresholds: { minPressure, minDirection, minResponsePx, minDirectionalRun },
  };
}

const WIND_PHI = (1 + Math.sqrt(5)) / 2;
const WIND_STRETCH_MAX_FRAC = 1 / (WIND_PHI * WIND_PHI * 4);
const WIND_BASE_HALF_EXTENT_PX = 72;
const WIND_SNAP = 0.004;

/**
 * F-LAW 2 renderer-equivalent left-right contour asymmetry (content px).
 * +dirX trail-stretches the left / lead-compresses the right; -dirX flips.
 */
export function expectedWindAsymmetryPx(pressure, dirX) {
  const p = Number.isFinite(Number(pressure)) ? Math.max(0, Math.min(1, Number(pressure))) : 0;
  const d = Number.isFinite(Number(dirX)) ? Math.max(-1, Math.min(1, Number(dirX))) : 0;
  if (p < WIND_SNAP || Math.abs(d) < WIND_SNAP) return 0;
  const amp = WIND_STRETCH_MAX_FRAC * WIND_BASE_HALF_EXTENT_PX * p * Math.abs(d);
  return Math.sign(d) * amp * WIND_PHI;
}

/**
 * Wind-resistance metric for kernel streams that have pressure + dirX but
 * no live SVG contour. Fills expectedWindAsymmetryPx when the capture did
 * not publish horizontalExtent.asymmetryPx.
 */
export function kernelWindResistanceMetric(samples = [], options) {
  const rows = (Array.isArray(samples) ? samples : []).map((sample) => {
    const pressure = Number(sample?.dataset?.windPressure ?? sample?.wind?.pressure ?? sample?.pressure);
    const direction = Number(sample?.dataset?.windDirX ?? sample?.wind?.dirX ?? sample?.dirX);
    const captured = Number(sample?.bodyContour?.horizontalExtent?.asymmetryPx);
    return {
      dataset: { windPressure: pressure, windDirX: direction },
      bodyContour: {
        horizontalExtent: {
          asymmetryPx: Number.isFinite(captured) ? captured : expectedWindAsymmetryPx(pressure, direction),
        },
      },
    };
  });
  return windResistanceMetric(rows, options);
}

/**
 * Fill dropped foot bins so accel / X-wall chatter cannot erase the
 * lower envelope. Empty edge bins come from bbox padding; interior
 * holes come from a sheared path missing a 41-wide histogram slot.
 * Neighbors carry the planted read â€” we never invent a new foot.
 */
function finiteContourSample(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function completeContourBottomY(bottomY = []) {
  const ordered = (Array.isArray(bottomY) ? bottomY : []).map(finiteContourSample);
  const filled = ordered.slice();
  for (let i = 0; i < filled.length; i += 1) {
    if (filled[i] !== null) continue;
    let left = i - 1;
    while (left >= 0 && filled[left] === null) left -= 1;
    let right = i + 1;
    while (right < filled.length && filled[right] === null) right += 1;
    if (left >= 0 && right < filled.length) {
      const t = (i - left) / (right - left);
      filled[i] = filled[left] + (filled[right] - filled[left]) * t;
    } else if (left >= 0) {
      filled[i] = filled[left];
    } else if (right < filled.length) {
      filled[i] = filled[right];
    }
  }
  return filled;
}

/**
 * N246 — kernel support/lobe must be live on the proof even if DOM dataset
 * freezes. gait1 samples.json kept one dataset tuple while bodyX/supportSide
 * moved; later takes painted dataset. Either way the receipt has to expose
 * per-frame kernel plant/compress/side, and flag a stale dataset channel.
 */
export const GAIT_DENSE_PROOF_KEYS = Object.freeze([
  "phase",
  "supportSide",
  "plantedWorldX",
  "loadedCompress",
  "loadedWidth",
  "swingLift",
  "swingForward",
  "comLateral",
  "comVertical",
]);

export function summarizeLowerContour(contour = {}) {
  const bottomY = Array.isArray(contour?.bottomY) ? contour.bottomY : [];
  const finite = bottomY.map((value) => Number(value)).filter(Number.isFinite);
  if (!finite.length) {
    return {
      sampleCount: 0,
      leftBottom: null,
      midBottom: null,
      rightBottom: null,
      maxY: null,
      minY: null,
      spanY: null,
    };
  }
  const n = bottomY.length;
  const at = (frac) => {
    const value = Number(bottomY[Math.min(n - 1, Math.max(0, Math.floor(frac * (n - 1))))]);
    return Number.isFinite(value) ? value : null;
  };
  const maxY = Math.max(...finite);
  const minY = Math.min(...finite);
  return {
    sampleCount: n,
    leftBottom: at(0.25),
    midBottom: at(0.5),
    rightBottom: at(0.75),
    maxY,
    minY,
    spanY: maxY - minY,
  };
}

export function gaitSupportLiveMetric(samples = []) {
  const list = Array.isArray(samples) ? samples : samples?.samples;
  const rows = (Array.isArray(list) ? list : []).map((sample) => {
    const support = sample?.gaitProof ?? sample?.body?.support ?? sample?.support ?? {};
    const gait = sample?.gaitProof ?? sample?.body?.gait ?? sample?.gait ?? {};
    const dataset = sample?.dataset ?? {};
    const bodyX = Number(
      sample?.gaitProof?.bodyX ?? sample?.bodyX ?? sample?.body?.body?.x,
    );
    return {
      bodyX,
      phase: Number(sample?.gaitProof?.phase ?? gait.phase),
      side: Number(sample?.gaitProof?.supportSide ?? support.side ?? sample?.supportSide),
      plantedCompress: Number(
        sample?.gaitProof?.plantedCompress ?? support.plantedCompress,
      ),
      incomingCompress: Number(
        sample?.gaitProof?.incomingCompress ?? support.incomingCompress,
      ),
      plantedWorldX: Number(
        sample?.gaitProof?.plantedWorldX ?? support.plantedWorldX,
      ),
      dsPhase: Number(dataset.gaitPhase),
      dsPlantX: Number(dataset.gaitPlantX),
      dsPoseX: Number(dataset.worldPoseX),
    };
  }).filter((row) => Number.isFinite(row.bodyX));

  const unique = (key, digits = 3) =>
    new Set(
      rows
        .map((row) => (Number.isFinite(row[key]) ? row[key].toFixed(digits) : ""))
        .filter(Boolean),
    ).size;
  const travel = rows.length >= 2
    ? Math.abs(rows[rows.length - 1].bodyX - rows[0].bodyX)
    : 0;
  const kernelPhaseLive = unique("phase") > 2;
  const kernelSideLive = unique("side", 0) > 1;
  const kernelCompressLive = unique("plantedCompress") > 2;
  const datasetPhaseLive = unique("dsPhase") > 2;
  const datasetPoseLive = unique("dsPoseX") > 2;
  const datasetStaleVsKernel =
    travel > 8 &&
    (kernelSideLive || kernelPhaseLive || kernelCompressLive) &&
    !datasetPhaseLive &&
    !datasetPoseLive;
  return {
    n: rows.length,
    travel,
    kernelPhaseLive,
    kernelSideLive,
    kernelCompressLive,
    datasetPhaseLive,
    datasetPoseLive,
    datasetStaleVsKernel,
    uniqueKernelPhase: unique("phase"),
    uniqueKernelSide: unique("side", 0),
    uniquePlantedCompress: unique("plantedCompress"),
    uniqueDatasetPhase: unique("dsPhase"),
    uniqueDatasetPoseX: unique("dsPoseX"),
    pass: rows.length > 0 && !datasetStaleVsKernel && (kernelSideLive || kernelPhaseLive),
  };
}

export function contourCompletenessMetric(bottomY = [], { maxNulls = 0 } = {}) {
  const ordered = (Array.isArray(bottomY) ? bottomY : []).map(finiteContourSample);
  const filled = completeContourBottomY(ordered);
  const rawNulls = ordered.filter((value) => value === null).length;
  const remainingNulls = filled.filter((value) => value === null).length;
  return {
    pass: filled.length > 0 && remainingNulls <= maxNulls,
    sampleCount: ordered.length,
    rawNullCount: rawNulls,
    remainingNullCount: remainingNulls,
    bottomY: filled,
    thresholds: { maxNulls },
  };
}
