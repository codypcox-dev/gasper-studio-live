import { useCallback, useState, type ReactElement } from "react";
import {
  PRESENCE_IDS,
  type MachineSnap,
  type PresenceId,
  readMachine,
} from "../../../desktop/src/gasper/machine/GasperStateMachine";
import { EIGHT_HOLD_STATE_LABELS } from "./daisReviewMode";
import { applyMachineIntent } from "./machineApply";

export function MachineStrip(): ReactElement {
  const [snap, setSnap] = useState<MachineSnap>(() => readMachine());

  const go = useCallback((intent: Parameters<typeof applyMachineIntent>[0]) => {
    setSnap(applyMachineIntent(intent));
  }, []);

  return (
    <div className="machine-strip" data-testid="machine-strip">
      <section aria-label="Locomotion">
        <span>Locomotion</span>
        <button type="button" data-active={snap.locomotion === "rest" ? "1" : "0"} data-testid="machine-rest" onClick={() => go({ type: "rest" })}>
          Rest
        </button>
        <button type="button" data-active={snap.locomotion === "walk" ? "1" : "0"} data-testid="machine-walk" onClick={() => go({ type: "walk" })}>
          Walk
        </button>
      </section>
      <section aria-label="Take">
        <span>Take</span>
        <button type="button" data-active={snap.take === "idle" ? "1" : "0"} data-testid="machine-take-idle" onClick={() => go({ type: "stopTake" })}>
          Idle
        </button>
        <button type="button" data-active={snap.take === "playing" ? "1" : "0"} data-testid="machine-take-20" onClick={() => go({ type: "play20" })}>
          20s
        </button>
      </section>
      <section className="machine-strip__presence" aria-label="Presence">
        <span>Presence</span>
        {PRESENCE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            data-active={snap.presence === id ? "1" : "0"}
            data-testid={`machine-presence-${id}`}
            onClick={() => go({ type: "presence", id: id as PresenceId })}
          >
            {EIGHT_HOLD_STATE_LABELS[id]}
          </button>
        ))}
      </section>
    </div>
  );
}
