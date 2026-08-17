export {
  SCAFFOLD_RINGS,
  SCAFFOLD_SECTORS,
  SCAFFOLD_VERTEX_COUNT,
  SCAFFOLD_FACE_COUNT,
  LATTICE_NODE_COUNT,
  LATTICE_TRIANGLE_COUNT,
  SCAFFOLD_COUPLING_LAW,
  SCAFFOLD_COUPLING,
  SCAFFOLD_SOURCE_KINDS,
  SCAFFOLD_FORBIDDEN,
  restLatticeNodes,
  latticeCouplingGamma,
  composeScaffoldVertices,
  composeScaffoldScalars,
  composeAdaptiveShellScaffold,
  sourcesFromCausalGoals,
  assertScaffoldContract,
  transientFaces,
  zeroSource,
} from "./AdaptiveShellScaffold";
export type {
  AdaptiveShellFrame,
  ScaffoldSource,
  ScaffoldSourceKind,
  ScaffoldCoupling,
  LocalFrame,
} from "./AdaptiveShellScaffold";
export {
  RELIEF_RESAMPLE,
  reliefScaffoldSource,
  pressureScaffoldSource,
  capturedScaffoldSource,
  resampleFieldToScaffold,
  sampleFieldBilinear,
} from "./ReliefScaffoldSource";
export {
  publishScaffoldAuthority,
  readScaffoldAuthority,
  SCAFFOLD_PRESSURE_PUFF_PX,
} from "./ScaffoldFieldAuthority";
export type { ScaffoldAuthorityState } from "./ScaffoldFieldAuthority";
export {
  FIELD_LAYER_ORDER,
  FIELD_SPACE,
  composeNamedField,
  fieldEnergy,
  assertFieldIdentity,
} from "./DisplacementField";
export {
  mountGasperField,
  dispatchField,
  listLooks,
  loadLook,
  saveLook,
} from "./GasperFieldApi";
export type { SavedLook, GasperFieldSurface } from "./GasperFieldApi";
export {
  GOOSE_LAW,
  GOOSE_SHADE,
  GOOSE_COARSE,
  GOOSE_FINE,
  GOOSE_AMPLITUDE,
  evaluateGooseField,
  collectGoosePapules,
  dermisMask,
  hexPapule,
  gooseFieldEnergy,
  goosePivot,
} from "./GoosebumpsField";
export type { GoosePapule } from "./GoosebumpsField";
export {
  CUBE_LAW,
  CUBE_DIRS,
  cube,
  cubeAdd,
  cubeSub,
  cubeScale,
  cubeNeighbor,
  cubeRotate60,
  cubeRotate60About,
  cubeReflect,
  cubeReflectAbout,
  cubeDistance,
  cubeRound,
  cubeValid,
  oddRToCube,
  cubeToOddR,
  uvToCube,
  cubeToUv,
  uvRotate60,
  hexSiteDistance,
  hexDualDistance,
  hexKernel,
} from "./HexCube";
export type { Cube, OddR } from "./HexCube";
export { rotateScaffoldField, spinScaffoldField, sampleFieldBilinear, HEX_ROTATE_LAW, POLE_SPIN_LAW } from "./HexFieldRotate";
export {
  CAGE_LIGHT_LAW,
  CAGE_LIGHTS,
  cageNormalAt,
  lightCageVertex,
  rotateLightXY,
  fieldHasEnergy,
} from "./CageLight";
