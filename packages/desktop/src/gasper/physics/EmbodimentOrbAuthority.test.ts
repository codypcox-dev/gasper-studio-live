/**
 * N330 / N331 — embodiment settings must not collapse to Presence's sphere.
 * Source pins only. Pixels remain Cody's (S3).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { GASPER_EMBODIMENT_PROFILES } from "../GasperRigDefinition";
import {
  WISPWALKER_CANONICAL_CONTOUR,
  baseRadiusV63,
  formRadiusAtFor,
  gaussAngle,
} from "../GasperContourSolver";

const as3 = readFileSync(new URL("../assets/all-script-3.js", import.meta.url), "utf8");
const candidate = readFileSync(
  new URL("../assets/candidate-script-3.js", import.meta.url),
  "utf8",
);
const definition = readFileSync(new URL("../GasperRigDefinition.ts", import.meta.url), "utf8");
const controller = readFileSync(new URL("../GasperRigController.ts", import.meta.url), "utf8");
const documentMount = readFileSync(new URL("../GasperDocument.ts", import.meta.url), "utf8");
const stage = readFileSync(
  new URL("../../../../gasper-studio/src/IntegratedGasperStage.tsx", import.meta.url),
  "utf8",
);
const tuning = readFileSync(
  new URL("../../../../gasper-studio/src/tuning/tuningRegistry.ts", import.meta.url),
  "utf8",
);

const WISPWALKER_ENVELOPE = { sx: 0.93, sy: 1.16, cy: 2 };
const PRESENCE_ENVELOPE = { sx: 1.0, sy: 1.015, cy: 0 };

const liveProfilesMatch = as3.match(
  /const FORM_PROFILES = Object\.freeze\((\{[\s\S]*?\})\);\r?\n\s*\/\/ Canonical Wispwalker/,
);
if (!liveProfilesMatch) throw new Error("live FORM_PROFILES table not found");
const LIVE_FORM_PROFILES = Function(
  `"use strict"; return (${liveProfilesMatch[1]});`,
)() as Record<string, Record<string, unknown>>;

describe("N331 embodiment settings are not Presence's orb", () => {
  it("TS Wispwalker envelope matches live FormMaster, not Presence", () => {
    const wisp = GASPER_EMBODIMENT_PROFILES.wispwalker;
    const presence = GASPER_EMBODIMENT_PROFILES.presence;
    expect(wisp).toBeDefined();
    expect(presence).toBeDefined();
    expect(wisp.sx).toBe(WISPWALKER_ENVELOPE.sx);
    expect(wisp.sy).toBe(WISPWALKER_ENVELOPE.sy);
    expect(wisp.cy).toBe(WISPWALKER_ENVELOPE.cy);
    expect(presence.sx).toBe(PRESENCE_ENVELOPE.sx);
    expect(presence.sy).toBe(PRESENCE_ENVELOPE.sy);
    expect(presence.cy).toBe(PRESENCE_ENVELOPE.cy);
    expect(wisp.sx).not.toBe(presence.sx);
    expect(wisp.sy).not.toBe(presence.sy);
    expect(as3).toContain("'wispwalker':Object.freeze({");
    expect(as3).toContain("sx:.93,sy:1.16,cx:0,cy:2");
    expect(definition).not.toContain("sx: 0.992");
    expect(candidate).toContain("sx:.93,sy:1.16,cx:0,cy:2");
    expect(candidate).not.toContain("sx:.992,sy:1.000,cx:0,cy:0");
  });

  it("Wispwalker form coeffs write to wispwalker even if the silhouette is Presence", () => {
    expect(as3).toContain("function liveFormCoeffProfile(");
    expect(as3).toMatch(/if\(key==='crownAmp'[\s\S]*return 'wispwalker'/);
    expect(as3).toContain("const target=liveFormCoeffProfile(key,profile)");
    expect(as3).toContain("globalThis.__GASPER_LIVE_COEFFS__[target][key]=value");
    expect(controller).toContain(
      'this.authoredMainForm || this.selection.getState().embodiment || "wispwalker"',
    );
    expect(controller).not.toContain(
      'this.authoredMainForm || this.selection.getState().embodiment || "presence"',
    );
  });

  it("boot and settings fallbacks do not remorph the live hull to Presence", () => {
    const attach = controller.slice(
      controller.indexOf("if (mount.legacyFormMaster)"),
      controller.indexOf("this.mixer.rebuildNodeCache()"),
    );
    expect(attach).toContain("const bootForm =");
    expect(attach).toContain('rig.setProfile?.(bootForm, "settle")');
    expect(attach).not.toContain('embodiment || "presence"');
    expect(documentMount).not.toContain('rig.setProfile("presence")');
    expect(documentMount).toContain('rig.setProfile("wispwalker")');
    expect(stage).toContain('const emb = d.embodiment_id || "wispwalker"');
    expect(stage).not.toContain('d.embodiment_id || "presence"');
    expect(tuning).toContain('const DEFAULT_EMBODIMENT = "wispwalker"');
    expect(tuning).not.toContain('const DEFAULT_EMBODIMENT = "presence"');
  });

  it("keeps every typed embodiment projection aligned with the live canonical form table", () => {
    const fields = [
      "sx",
      "sy",
      "cx",
      "cy",
      "face",
      "faceX",
      "faceY",
      "faceScaleX",
      "faceScaleY",
      "eyeWidthScale",
      "eyeOpenScale",
      "mouthYShift",
      "mouthScale",
      "mouthOpenScale",
      "horizon",
      "disc",
      "lensed",
      "geometryModel",
      "dormantCollapse",
      "dormantSpin",
      "frontAppendage",
      "tailPolicy",
    ] as const;

    for (const [id, typed] of Object.entries(GASPER_EMBODIMENT_PROFILES)) {
      const live = LIVE_FORM_PROFILES[id];
      expect(live, `missing live profile ${id}`).toBeDefined();

      for (const field of fields) {
        const liveValue =
          field === "geometryModel"
            ? (live[field] ?? "radial-shared-topology")
            : live[field];
        expect(typed[field], `${id}.${field}`).toEqual(liveValue);
      }
    }
  });

  it("keeps Wispwalker identity static and spends gait only in the downstream articulation pass", () => {
    const radiusStart = as3.indexOf("function formRadiusAtFor");
    const wispStart = as3.indexOf("if(profileId==='wispwalker')", radiusStart);
    const cometStart = as3.indexOf("}else if(profileId==='comet')", wispStart);
    const identityBlock = as3.slice(wispStart, cometStart);
    const identityCode = identityBlock.replace(/\/\/.*$/gm, "");

    expect(identityBlock).toContain("WISPWALKER_CANONICAL_CONTOUR");
    expect(identityCode).not.toMatch(
      /physGait|supportSide|swingLiftUnits|swingAdvanceUnits|loadedDropUnits/,
    );

    const sampleStart = as3.indexOf("function sampleBodyForProfile");
    const sampleEnd = as3.indexOf("function applyMeshWarp", sampleStart);
    const articulationBlock = as3.slice(sampleStart, sampleEnd);
    expect(articulationBlock).toContain("__GASPER_STANCE__");
    expect(articulationBlock).toContain("S.left.x-100)*wL+(S.right.x-140)*wR+(S.crotch.x-120)*wC");
    expect(articulationBlock).not.toContain("posed.y-=_liftPx*_swingArtW");

    const w = WISPWALKER_CANONICAL_CONTOUR;
    for (const th of [
      -Math.PI / 2,
      0,
      w.leftRootTheta,
      w.leftLobeTheta,
      Math.PI / 2,
      w.rightLobeTheta,
      w.rightRootTheta,
      Math.PI,
    ]) {
      const expected =
        baseRadiusV63(th) +
        w.crownAmp * gaussAngle(th, w.crownTheta, w.crownSigma) -
        w.lowerBowlTrimAmp *
          gaussAngle(th, w.lowerBowlTrimTheta, w.lowerBowlTrimSigma) +
        w.chinAmp * gaussAngle(th, w.chinTheta, w.chinSigma) +
        w.lobeAmp *
          (gaussAngle(th, w.leftLobeTheta, w.lobeSigma) +
            gaussAngle(th, w.rightLobeTheta, w.lobeSigma)) +
        w.rootAmp *
          (gaussAngle(th, w.leftRootTheta, w.rootSigma) +
            gaussAngle(th, w.rightRootTheta, w.rootSigma)) -
        w.cleftDepth * gaussAngle(th, w.cleftTheta, w.cleftSigma);
      expect(formRadiusAtFor("wispwalker", th)).toBeCloseTo(expected, 12);
    }
  });
});
