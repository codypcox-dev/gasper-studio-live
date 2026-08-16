export type CometGenerationInput = {
  mix: number;
  timeSeconds: number;
  energy: number;
  motion: number;
  seed: number;
  interrupted?: boolean;
};

export type CometWakeGeometry = {
  forwardMassDeform: number;
  backWake: { pathD: string; opacity: number; width: number; length: number };
  frontFlow: { pathD: string; opacity: number };
  attachedTail: boolean;
  tailDirection: number;
  wakeWidth: number;
  wakeLength: number;
  wakePersistence: number;
  spectralFalloff: number;
  energyCoupling: number;
  motionCoupling: number;
  hash: string;
  mix: number;
};
