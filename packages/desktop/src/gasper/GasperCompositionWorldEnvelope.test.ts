import { describe, expect, it } from 'vitest';
import {
  clampWorldPoseToCompositionEnvelope,
  createCompositionWorldEnvelope,
  renderableWorldBoundsAt,
  renderableZMax,
  DEFAULT_MIN_PRESENCE_FRACTION,
} from './GasperCompositionWorldEnvelope';
import { PHI } from './physics/PhiLaw';
import { WORLD_SPACE_CONSTANTS } from './space/WorldSpace';

const makeEnv = () =>
  createCompositionWorldEnvelope({
    stageWidth: 761,
    stageHeight: 1135,
    cameraZoom: 2.34,
    cameraPanX: -5.4,
    cameraPanY: 1.3,
    safeFit: { x: 24, y: 20, width: 192, height: 184 },
    geometry: { x: 36, y: 33, width: 171, height: 154 },
  })!;

describe('CompositionWorldEnvelope', () => {
  it('rejects invalid calibration input', () => {
    expect(
      createCompositionWorldEnvelope({
        stageWidth: 0,
        stageHeight: 100,
        cameraZoom: 1,
        cameraPanX: 0,
        cameraPanY: 0,
        safeFit: { x: 0, y: 0, width: 1, height: 1 },
        geometry: { x: 0, y: 0, width: 1, height: 1 },
      }),
    ).toBeNull();
  });

  it('preserves the owner near-glass plane but pulls the unreadable far plane inward', () => {
    const env = makeEnv();
    const zMax = renderableZMax(env);
    expect(zMax).toBeGreaterThan(0);
    expect(zMax).toBeLessThan(WORLD_SPACE_CONSTANTS.zFar);
    expect(renderableWorldBoundsAt(-9999, env).z).toBe(
      WORLD_SPACE_CONSTANTS.zNear,
    );
  });

  it('subtracts organism clearance from conceptual lateral room', () => {
    const env = makeEnv();
    const home = renderableWorldBoundsAt(0, env);
    const near = renderableWorldBoundsAt(WORLD_SPACE_CONSTANTS.zNear, env);
    const conceptualXHalf = WORLD_SPACE_CONSTANTS.extentWidth / 2;
    expect(home.xMin).toBeGreaterThan(-conceptualXHalf);
    expect(home.xMax).toBeLessThan(conceptualXHalf);
    expect(Math.abs(near.xMin)).toBeLessThan(Math.abs(home.xMin));
    expect(near.xMax).toBeLessThan(home.xMax);
  });

  it('keeps a finite floor/ceiling altitude range at home and near glass', () => {
    const env = makeEnv();
    for (const z of [WORLD_SPACE_CONSTANTS.zNear, 0, 800]) {
      const b = renderableWorldBoundsAt(z, env);
      expect(Number.isFinite(b.yMin)).toBe(true);
      expect(Number.isFinite(b.yMax)).toBe(true);
      expect(b.yMin).toBeGreaterThanOrEqual(0);
      expect(b.yMax).toBeGreaterThanOrEqual(b.yMin);
    }
  });

  it('reserves readable vertical headroom for the field-scaled physics beat', () => {
    const env = createCompositionWorldEnvelope({
      stageWidth: 1072,
      stageHeight: 758,
      cameraZoom: 2.396618158143551,
      cameraPanX: -3.5902372000024676,
      cameraPanY: 3.2390146666566357,
      safeFit: {
        x: -39.4866403713379,
        y: -30.514254856315617,
        width: 321.96936686328127,
        height: 278.3255220417328,
      },
      geometry: {
        x: 36.89607620239258,
        y: 45.86846171733886,
        width: 169.2039337158203,
        height: 125.56008889427184,
      },
    });
    expect(env).not.toBeNull();

    const bounds = renderableWorldBoundsAt(0, env!);
    const measuredBodyHeightUnits = env!.geometry.height * WORLD_SPACE_CONSTANTS.unitsPerContentPx;
    expect(bounds.yMax).toBeGreaterThan(measuredBodyHeightUnits * 0.3);
  });

  it('clamps a conceptual-edge pose through the shared renderable seam', () => {
    const env = makeEnv();
    const r = clampWorldPoseToCompositionEnvelope(
      { x: 960, y: 0, z: 0, tilt: 0 },
      env,
    );
    expect(r.constrained).toBe(true);
    expect(r.axes).toContain('x');
    expect(r.pose.x).toBeLessThan(960);
    expect(r.pose.z).toBe(0);
  });

  it('clamps far-depth readability without changing tilt', () => {
    const env = makeEnv();
    const r = clampWorldPoseToCompositionEnvelope(
      { x: 0, y: 0, z: WORLD_SPACE_CONSTANTS.zFar, tilt: 17 },
      env,
    );
    expect(r.axes).toContain('z');
    expect(r.pose.z).toBeCloseTo(renderableZMax(env), 6);
    expect(r.pose.tilt).toBe(17);
  });

  // GASPER-NORTHSTAR-001 — far-presence floor. The old far plane derived from
  // a bare 0.14 readability floor, letting a lawful walker recede to dScale
  // 0.45 (z ≈ 2356) so the singularity rest held far from home — the N44
  // apparent-scale excursion. The presence floor now binds at φ⁻¹ ≈ 0.618.
  it('binds the far plane to the φ⁻¹ presence floor (dScale ≥ 1/PHI)', () => {
    const env = makeEnv();
    const zMax = renderableZMax(env);
    const farScale = WORLD_SPACE_CONSTANTS.homeViewDistance / (WORLD_SPACE_CONSTANTS.homeViewDistance + zMax);
    expect(farScale).toBeCloseTo(DEFAULT_MIN_PRESENCE_FRACTION, 6);
    expect(farScale).toBeCloseTo(1 / PHI, 6);
    // The presence floor is strictly nearer than the old readability far plane.
    expect(zMax).toBeLessThan(WORLD_SPACE_CONSTANTS.zFar);
    expect(zMax).toBeLessThan(2433); // readability-only far plane for makeEnv()
  });

  it('fences the N44-observed far hold (z=2356, dScale 0.449) to the presence plane', () => {
    const env = makeEnv();
    const r = clampWorldPoseToCompositionEnvelope(
      { x: 0, y: 0, z: 2356, tilt: 0 },
      env,
    );
    expect(r.axes).toContain('z');
    expect(r.constrained).toBe(true);
    expect(r.pose.z).toBeCloseTo(renderableZMax(env), 6);
    const clampedScale =
      WORLD_SPACE_CONSTANTS.homeViewDistance /
      (WORLD_SPACE_CONSTANTS.homeViewDistance + r.pose.z);
    expect(clampedScale).toBeGreaterThanOrEqual(DEFAULT_MIN_PRESENCE_FRACTION);
    // The N44 hold read at 0.449; the fenced hold must read at ≥ 0.618.
    expect(clampedScale).toBeGreaterThan(0.449 + 0.1);
  });

  it('presence floor binds even when readability alone would allow deeper travel', () => {
    // A calibration with a huge form on a huge stage (readability far plane
    // very deep) must still respect the φ⁻¹ presence fence.
    const env = createCompositionWorldEnvelope({
      stageWidth: 4000,
      stageHeight: 4000,
      cameraZoom: 1,
      cameraPanX: 0,
      cameraPanY: 0,
      safeFit: { x: 100, y: 100, width: 3800, height: 3800 },
      geometry: { x: 100, y: 100, width: 3000, height: 3000 },
    })!;
    const zMax = renderableZMax(env);
    const farScale =
      WORLD_SPACE_CONSTANTS.homeViewDistance /
      (WORLD_SPACE_CONSTANTS.homeViewDistance + zMax);
    expect(farScale).toBeCloseTo(DEFAULT_MIN_PRESENCE_FRACTION, 6);
  });

  it('honors a custom presence floor', () => {
    const env = createCompositionWorldEnvelope({
      stageWidth: 761,
      stageHeight: 1135,
      cameraZoom: 2.34,
      cameraPanX: -5.4,
      cameraPanY: 1.3,
      safeFit: { x: 24, y: 20, width: 192, height: 184 },
      geometry: { x: 36, y: 33, width: 171, height: 154 },
      minPresenceFraction: 0.8,
    })!;
    const zMax = renderableZMax(env);
    const farScale =
      WORLD_SPACE_CONSTANTS.homeViewDistance /
      (WORLD_SPACE_CONSTANTS.homeViewDistance + zMax);
    expect(farScale).toBeCloseTo(0.8, 6);
    // 0.8 is a stricter floor than the φ default: the far plane is nearer.
    expect(zMax).toBeLessThan(renderableZMax(makeEnv()));
  });

  it('keeps the near-glass plane intact under the presence fence', () => {
    const env = makeEnv();
    expect(renderableWorldBoundsAt(-9999, env).z).toBe(
      WORLD_SPACE_CONSTANTS.zNear,
    );
    const nearScale =
      WORLD_SPACE_CONSTANTS.homeViewDistance /
      (WORLD_SPACE_CONSTANTS.homeViewDistance + WORLD_SPACE_CONSTANTS.zNear);
    expect(nearScale).toBeGreaterThan(DEFAULT_MIN_PRESENCE_FRACTION);
    expect(nearScale).toBeCloseTo(1.2, 6);
  });
});
