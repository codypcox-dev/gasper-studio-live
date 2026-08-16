/** VEC-401 — Single organism clock surface. */
export {
  GasperOrganismClock,
  getGasperOrganismClock,
  resetGasperOrganismClockForTests,
  installGasperOrganismClock,
  isGasperOrganismClockPort,
  ORGANISM_CLOCK_VERSION,
  ORGANISM_CLOCK_PACKET,
  ORGANISM_CLOCK_GLOBAL_KEY,
} from "./GasperOrganismClock";
export type {
  OrganismClockMode,
  OrganismClockDirection,
  OrganismClockFrame,
  OrganismClockSubscriber,
  OrganismClockFault,
  OrganismClockInspection,
  OrganismClockOptions,
  GasperOrganismClockPort,
  GasperOrganismClockGlobal,
} from "./GasperOrganismClock";

export {
  attachGasperGsapClockBridge,
  resetGasperGsapClockBridgeForTests,
  GSAP_CLOCK_BRIDGE_GLOBAL_KEY,
  GSAP_CLOCK_SUBSCRIBER_ID,
  GSAP_CLOCK_PRIORITY,
} from "./GasperGsapClockBridge";
export type {
  GasperGsapClockBridgeHandle,
  GasperGsapClockBridgeInspection,
} from "./GasperGsapClockBridge";
