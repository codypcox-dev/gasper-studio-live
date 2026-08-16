export type DormantGenerationInput = {
  mix: number;
  timeSeconds: number;
  energy: number;
  motion: number;
  seed: number;
  interrupted?: boolean;
  collapseProgress?: number;
};

export type DormantOrbitGeometry = {
  dormantCollapse: number;
  orbitRings: Array<{ pathD: string; opacity: number; radius: number }>;
  orbitalParticles: Array<{ x: number; y: number; r: number; opacity: number }>;
  retainedIdentityCues: boolean;
  dormantEnergyPolicy: number;
  collapseTiming: number;
  wakeRestoration: number;
  interruptionHeld: boolean;
  hash: string;
  mix: number;
  orphanedRings: false;
};
