import {
  type MachineIntent,
  type MachineSnap,
  publishMachine,
  readMachine,
  reduceMachine,
} from "../../../desktop/src/gasper/machine/GasperStateMachine";
import {
  playNorthstarTwentyFromRail,
  selectEightHoldState,
  setWalkBooLoopFromRail,
  stopWalkBooTwentyFromRail,
} from "./daisFirstControls";

/** Apply an intent: reduce, publish flags, fire the rails that already exist. */
export function applyMachineIntent(intent: MachineIntent): MachineSnap {
  const next = reduceMachine(readMachine(), intent);
  publishMachine(next);
  if (next.locomotion === "rest") {
    stopWalkBooTwentyFromRail();
  } else if (next.takePlay) {
    setWalkBooLoopFromRail(true);
    playNorthstarTwentyFromRail();
  }
  if (intent.type === "presence") {
    selectEightHoldState(next.presence);
  }
  return next;
}
