/**
 * Cody-authored Wispwalker home profile captured from the live 5179 Dais.
 *
 * Visual authority:
 * packages/gasper-studio/public/__sol_review/wispwalker-user-final-settings.png
 * SHA-256: e8347bb82a472afdf9822b4bebdec37bbe6cdf81199c26aeb299c3ab09722c6a
 * Live 5179 dump (N333): research/proofs/grok-successor-002/live-5179-n333-capture/
 *
 * These are profile defaults, not motion/camera tuning. Camera, world-pose,
 * heading, gait dynamics, materials, and facial grammar must not rewrite them.
 */
export const WISPWALKER_AUTHORING_DEFAULTS = Object.freeze({
  expressionGain: 0.85,
  rig: Object.freeze({
    reliefAmplitude: 1,
    eyeOpenness: 0.55,
    energyLevel: 0.52,
    yawDegrees: 8,
  }),
  pose: Object.freeze({
    asym: 0,
    bodyLean: 0,
    postureX: 0,
    postureY: 0,
    wide: -1,
  }),
  form: Object.freeze({
    crownAmp: -5,
    chinAmp: -5,
    lobeAmp: 3.2,
    cleftDepth: 3.2,
    footAmp: 4,
    armAmp: 0,
  }),
  behavior: Object.freeze({
    walkAmp: 0.5,
    walkPeriodSeconds: 1.25,
    walkAccent: 0.6,
    stepDepth: 4,
    walkEnabled: 1,
    viscoTau: 0.25,
  }),
  physics: Object.freeze({
    gravityScale: 1,
    restitution: 0.62,
    launchPower: 1,
    intensity: 0.7,
  }),
  craft: Object.freeze({
    exaggeration: 1.25,
    tempo: 1,
    shotBias: "authored" as const,
  }),
});

export type WispwalkerAuthoringDefaults = typeof WISPWALKER_AUTHORING_DEFAULTS;
