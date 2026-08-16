import type { EnvironmentPhysicsProfile } from "../../../../shared/src/gasper-performance/reference/retarget.js";
import { CRAFT_AUTHORING_BODY_HEIGHT_PX } from "../curves/CraftPacks.js";
import { createPhysicsField } from "../physics/PhysicsField.js";
import { WORLD_SPACE_CONSTANTS } from "../space/WorldSpace.js";

const field = createPhysicsField({
  viewportWidthPx: WORLD_SPACE_CONSTANTS.extentWidth / WORLD_SPACE_CONSTANTS.unitsPerContentPx,
  viewportHeightPx: WORLD_SPACE_CONSTANTS.extentHeight / WORLD_SPACE_CONSTANTS.unitsPerContentPx,
  homeHeightPx: CRAFT_AUTHORING_BODY_HEIGHT_PX,
  unitsPerContentPx: WORLD_SPACE_CONSTANTS.unitsPerContentPx,
  zNearUnits: WORLD_SPACE_CONSTANTS.zNear,
  zFarUnits: WORLD_SPACE_CONSTANTS.zFar,
});

if (!field) throw new Error("canonical Gasper Studio physics field failed to resolve");

/** Exact black-room field consumed by the live Wispwalker physics body. */
export const WISPWALKER_STUDIO_ENVIRONMENT_PROFILE: EnvironmentPhysicsProfile = Object.freeze({
  schema: "gasper.environment-physics.v1",
  id: "gasper-studio-black-room",
  version: "1.0.0",
  gravityUnitsPerS2: field.gravityUnitsPerS2,
  frictionMu: field.frictionMu,
  restitution: field.restitution,
  bounds: Object.freeze({
    xMin: -field.xHalfHomeUnits,
    xMax: field.xHalfHomeUnits,
    yMin: 0,
    yMax: field.ceilingUnits,
    zMin: field.zNearUnits,
    zMax: field.zFarUnits,
  }),
  provenance: Object.freeze([
    "packages/desktop/src/gasper/physics/PhysicsField.ts#createPhysicsField",
    "packages/desktop/src/gasper/space/WorldSpace.ts#WORLD_SPACE_CONSTANTS",
    "packages/desktop/src/gasper/curves/CraftPacks.ts#CRAFT_AUTHORING_BODY_HEIGHT_PX",
  ]),
});
