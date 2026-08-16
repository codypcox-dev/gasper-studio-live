export type OpticsSystemId =
  | "secondary_reflection"
  | "edge_rims"
  | "lower_bounce"
  | "exterior_aura"
  | "normal_response"
  | "curvature_response"
  | "optical_depth"
  | "contact_shadow"
  | "ground_glow"
  | "embodiment_aware_contact";

export type OpticsOperationalClass =
  | "operational"
  | "operational-state-only"
  | "present-inactive"
  | "placeholder"
  | "broken"
  | "unsupported";

export type OpticsSystemState = {
  id: OpticsSystemId;
  /** Meaningful scalar 0–1 controlling visible response. */
  intensity: number;
  /** Path/geometry payload when operational (empty string if none). */
  geometryPath: string;
  hasGeometry: boolean;
  visible: boolean;
  classification: OpticsOperationalClass;
  mapsToAcceptedIntent: boolean;
  notes: string;
};

export type OpticsGenerationInput = {
  embodimentId: string;
  energy: number;
  motion: number;
  keyIntensity: number;
  rim: number;
  groundContact: number;
  normalStrength: number;
  curvatureResponse: number;
  opticalDepth: number;
  timeSeconds: number;
  seed: number;
};

export type OpticsOperationalState = {
  systems: OpticsSystemState[];
  hash: string;
  subordinateToFace: true;
};
