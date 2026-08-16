/**
 * Native .gasper document model (schema-aligned with architecture pack v0.2).
 * Standalone HTML is migration_source only.
 */

import { domainIds, MORPHOLOGY_DOMAINS } from "./GasperMorphologyDomains";
import type { DomainStatus } from "./GasperMorphologyDomains";
import { flattenDomainBindings, type GasperMultiDomainState } from "./GasperDomainState";
import { GasperSelectionModel } from "./GasperSelectionModel";

export type GasperDocumentV1 = {
  format: "gasper.document";
  documentId: string;
  version: string;
  manifest: {
    name: string;
    createdAt: string;
    modifiedAt: string;
    provenance: Array<Record<string, unknown>>;
    homeEmbodiment: "presence";
    legacySources?: Array<Record<string, unknown>>;
  };
  topology: {
    contourSamples: 512;
    structuralNodes: 360;
    structuralTriangles: 672;
    stableSharedTopology: true;
    geometryAsset: string;
    adaptiveReliefField: {
      width: 25;
      height: 40;
      maxSamples: 1000;
      asset: string;
      animated: true;
      topologyIndependent: true;
      movementBearing: true;
      decorativeTextureOnly: false;
    };
  };
  rig: {
    bindingsManifest: string;
    body: string;
    face: string;
    gaze: string;
    adaptiveRelief: string;
    internalEnergy: string;
    skin: string;
    surfaceTexture: string;
    normalCurvature: string;
    material: string;
    lighting: string;
    secondaryDynamics: string;
  };
  embodiments: Array<{
    id: string;
    asset: string;
    identityPreservationPolicy: string;
  }>;
  expressions: {
    anchorsAsset: string;
    microstatesAsset: string;
    anchorCount: 18;
    microstateCount: 13;
    families: 6;
  };
  materials: Record<string, unknown>;
  animation: {
    gsapTracks: string[];
    book004Adapter: true;
  };
  constraints: Array<Record<string, unknown>>;
  hashes: {
    architectureLock: string;
    document: string;
  };
  /** Runtime pose snapshot (not full binary mesh). */
  pose?: {
    bindings: Record<string, number>;
    domains: DomainStatusReport;
  };
};

export type DomainStatusReport = Record<
  string,
  { status: DomainStatus; notes: string }
>;

export function createGasperDocument(args: {
  documentId?: string;
  domainState: GasperMultiDomainState;
  domainStatus: DomainStatusReport;
}): GasperDocumentV1 {
  const now = new Date().toISOString();
  return {
    format: "gasper.document",
    documentId: args.documentId ?? "gasper-v6.5.5-dais",
    version: "0.2.0",
    manifest: {
      name: "Gasper Behavioral Continuity (native Dais)",
      createdAt: now,
      modifiedAt: now,
      provenance: [
        {
          kind: "migration_source",
          path: "sidekickex-gasper-v6.5.5-standalone.html",
          role: "protected_fixture",
        },
      ],
      homeEmbodiment: "presence",
      legacySources: [
        {
          type: "html_candidate",
          version: "6.5.5",
          role: "migration_source_and_regression_fixture_only",
        },
      ],
    },
    topology: {
      contourSamples: 512,
      structuralNodes: 360,
      structuralTriangles: 672,
      stableSharedTopology: true,
      geometryAsset: "assets/gasper-rig-v655.svg",
      adaptiveReliefField: {
        width: 25,
        height: 40,
        maxSamples: 1000,
        asset: "runtime:adaptiveRelief.samples",
        animated: true,
        topologyIndependent: true,
        movementBearing: true,
        decorativeTextureOnly: false,
      },
    },
    rig: {
      bindingsManifest: "runtime:registry",
      body: "domain:macro_deformation_field+structural_lattice",
      face: "domain:face_plane",
      gaze: "domain:face_plane.gaze",
      adaptiveRelief: "domain:adaptive_relief_field",
      internalEnergy: "domain:internal_volume_energy",
      skin: "domain:skin_surface",
      surfaceTexture: "domain:surface_texture_relief",
      normalCurvature: "domain:normal_curvature_field",
      material: "domain:skin_surface+material",
      lighting: "domain:world_space_optical_rig",
      secondaryDynamics: "domain:secondary_dynamics",
    },
    embodiments: GasperSelectionModel.EMBODIMENTS.map((id) => ({
      id,
      asset: `formMaster:FORM_PROFILES.${id}`,
      identityPreservationPolicy: "stable_shared_topology_v655",
    })),
    expressions: {
      anchorsAsset: "formMaster:EMOTION_FIXTURES",
      microstatesAsset: "formMaster:MICROSTATES",
      anchorCount: 18,
      microstateCount: 13,
      families: 6,
    },
    materials: {
      language: "dark-pearl",
      stack: ["shell-base", "inner-volume", "violet-crown", "cyan-reservoir", "key-reflection"],
    },
    animation: {
      gsapTracks: MORPHOLOGY_DOMAINS.map((d) => d.gsapTrack),
      book004Adapter: true,
    },
    constraints: [],
    hashes: {
      architectureLock: "gasper.architecture.lock@0.2.0",
      document: "pending",
    },
    pose: {
      bindings: flattenDomainBindings(args.domainState),
      domains: args.domainStatus,
    },
  };
}

/** Default migration inventory statuses after Dais v0.2 reconcile. */
export function defaultDomainStatusReport(): DomainStatusReport {
  const report: DomainStatusReport = {};
  for (const id of domainIds()) {
    switch (id) {
      case "canonical_contour":
        report[id] = {
          status: "PARTIAL",
          notes: "FormMaster owns 512-sample contour; Dais does not replace contour solver",
        };
        break;
      case "structural_lattice":
        report[id] = {
          status: "PARTIAL",
          notes: "360/672 via FormMaster polar topology; Dais coordinates, does not re-mesh",
        };
        break;
      case "macro_deformation_field":
        report[id] = {
          status: "COMPLETE",
          notes: "Bindings + host transform + FormMaster embodiment",
        };
        break;
      case "adaptive_relief_field":
        report[id] = {
          status: "PARTIAL",
          notes: "25×40 Float32 field animated in Dais; couples to #reliefLayer; FormMaster presets also available",
        };
        break;
      case "face_plane":
        report[id] = {
          status: "PARTIAL",
          notes: "Face bindings + FormMaster face plane; co-equal eyes/mouth",
        };
        break;
      case "internal_volume_energy":
        report[id] = {
          status: "PARTIAL",
          notes: "Energy volume state with lag/pulse; not glow-only; spatial apply on volume layers",
        };
        break;
      case "skin_surface":
        report[id] = {
          status: "PARTIAL",
          notes: "Tension/damping/coupling bindings drive shell coupling styles",
        };
        break;
      case "surface_texture_relief":
        report[id] = {
          status: "PARTIAL",
          notes: "Texture amount/scale distinct from material color",
        };
        break;
      case "normal_curvature_field":
        report[id] = {
          status: "PARTIAL",
          notes: "Normal/curvature scalars drive specular/surface-light response",
        };
        break;
      case "world_space_optical_rig":
        report[id] = {
          status: "PARTIAL",
          notes: "Key/rim/pearl/face-emissive/absorption channels separated",
        };
        break;
      case "secondary_dynamics":
        report[id] = {
          status: "PARTIAL",
          notes: "Inertia/lag/rebound/settling tick + residual coupling into relief",
        };
        break;
      default:
        report[id] = { status: "MISSING", notes: "unclassified" };
    }
  }
  return report;
}
