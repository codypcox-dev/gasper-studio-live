import { describe, expect, it } from 'vitest';
import { assessComposedOrganismFrame } from './GasperCompositionContract';

const stage = { x: 0, y: 0, width: 1000, height: 800 };

describe('Composed Organism Contract', () => {
  it('passes a centered living-presence frame', () => {
    const r = assessComposedOrganismFrame(
      stage,
      { x: 280, y: 160, width: 440, height: 480 },
      { x: 370, y: 300, width: 260, height: 180 },
    );
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    expect(r.faceOverlapFraction).toBe(1);
  });

  it('fails final body clipping even when body size itself is plausible', () => {
    const r = assessComposedOrganismFrame(stage, {
      x: -25,
      y: 180,
      width: 420,
      height: 440,
    });
    expect(r.ok).toBe(false);
    expect(r.violations).toContain('frame-left');
  });

  it('admits far-depth readable scale but rejects a disappearing speck', () => {
    expect(
      assessComposedOrganismFrame(stage, {
        x: 420,
        y: 320,
        width: 160,
        height: 160,
      }).ok,
    ).toBe(true);
    const speck = assessComposedOrganismFrame(stage, {
      x: 470,
      y: 370,
      width: 60,
      height: 60,
    });
    expect(speck.violations).toContain('too-small-width');
    expect(speck.violations).toContain('too-small-height');
  });

  it('rejects giant occupancy and bottle/sliver aspect collapse', () => {
    const giant = assessComposedOrganismFrame(stage, {
      x: 40,
      y: 20,
      width: 920,
      height: 740,
    });
    expect(giant.violations).toContain('too-large-width');
    expect(giant.violations).toContain('too-large-height');

    const sliver = assessComposedOrganismFrame(stage, {
      x: 450,
      y: 90,
      width: 100,
      height: 620,
    });
    expect(sliver.violations).toContain('aspect-collapse');
  });

  it('rejects face geometry that spatially detaches from the body', () => {
    const r = assessComposedOrganismFrame(
      stage,
      { x: 280, y: 160, width: 440, height: 480 },
      { x: 680, y: 310, width: 180, height: 160 },
    );
    expect(r.ok).toBe(false);
    expect(r.violations).toContain('face-detached');
  });
});
