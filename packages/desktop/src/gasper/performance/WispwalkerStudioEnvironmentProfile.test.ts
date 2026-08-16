import { describe, expect, it } from "vitest";

import { CRAFT_AUTHORING_BODY_HEIGHT_PX } from "../curves/CraftPacks.js";
import { createPhysicsField } from "../physics/PhysicsField.js";
import { WORLD_SPACE_CONSTANTS } from "../space/WorldSpace.js";
import { WISPWALKER_STUDIO_ENVIRONMENT_PROFILE } from "./WispwalkerStudioEnvironmentProfile.js";

describe("Wispwalker Studio environment profile", () => {
  it("is an exact projection of the live black-room physics field", () => {
    const field = createPhysicsField({
      viewportWidthPx: WORLD_SPACE_CONSTANTS.extentWidth / WORLD_SPACE_CONSTANTS.unitsPerContentPx,
      viewportHeightPx: WORLD_SPACE_CONSTANTS.extentHeight / WORLD_SPACE_CONSTANTS.unitsPerContentPx,
      homeHeightPx: CRAFT_AUTHORING_BODY_HEIGHT_PX,
      unitsPerContentPx: WORLD_SPACE_CONSTANTS.unitsPerContentPx,
      zNearUnits: WORLD_SPACE_CONSTANTS.zNear,
      zFarUnits: WORLD_SPACE_CONSTANTS.zFar,
    });
    expect(field).not.toBeNull();
    expect(WISPWALKER_STUDIO_ENVIRONMENT_PROFILE).toMatchObject({
      gravityUnitsPerS2: field!.gravityUnitsPerS2,
      frictionMu: field!.frictionMu,
      restitution: field!.restitution,
      bounds: {
        xMin: -field!.xHalfHomeUnits,
        xMax: field!.xHalfHomeUnits,
        yMin: 0,
        yMax: field!.ceilingUnits,
        zMin: field!.zNearUnits,
        zMax: field!.zFarUnits,
      },
    });
  });
});
