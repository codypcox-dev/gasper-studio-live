/**
 * DesignOps + ThinkOps authoring atlas.
 * Outcome-first chapters. Live readouts. No hidden organs.
 */
import type { ReactElement } from "react";
export const AUTHORING_CHAPTERS = [
  {
    id: "baseline",
    label: "Home",
    outcome: "Recognize, save, restore, morph the canonical form.",
    organ: "Canonical baseline · Wispwalker factory",
    teach: "Home is the pearl you return to. Morph is embodiment. Save writes your sculpt into the document.",
  },
  {
    id: "shape",
    label: "Shape",
    outcome: "Sculpt the living pearl — crown, cleft, feet, weight.",
    organ: "FormMaster live coefficients",
    teach: "These sliders are the body. They are not travel. Physics still walks him.",
  },
  {
    id: "walk",
    label: "Walk",
    outcome: "See both feet. Play the Northstar take from wherever he is.",
    organ: "WorldPhysicsDriver · take-northstar-20s",
    teach: "Walk review holds the shot. 20s is a score. Gait is kernel-derived — do not retune 8.",
  },
  {
    id: "skin",
    label: "Skin",
    outcome: "One 1000-field. Pressure puffs. Relief is goose. Coupling is the rim.",
    organ: "AdaptiveShell · C = Γ(L) + Σs · 512 / 360 / 1000",
    teach: "Neutral is +0. Blowfish is pressure. Goose is a relief preset. Do not remesh.",
  },
  {
    id: "fly",
    label: "Fly",
    outcome: "Boo / comet / bounce. Flight is an organ, not a costume.",
    organ: "Flight organ · launchComet",
    teach: "Presence is a sphere. Stay Wispwalker and enable Boo. Do not morph to fly.",
  },
  {
    id: "act",
    label: "Act",
    outcome: "Face, eight states, expression. Acting is not locomotion.",
    organ: "Expression fixtures · eight-state hold",
    teach: "Listening-orient is a face beat. It does not move the root.",
  },
  {
    id: "shoot",
    label: "Shot",
    outcome: "The monitor does not move during a performance.",
    organ: "Doctrine 1 · walk-review zoom 2",
    teach: "Fit face-plates. Walk review shows the plant. viewBox stays 240×220.",
  },
  {
    id: "proof",
    label: "Proof",
    outcome: "Earn a PHD before recutting a residual.",
    organ: "CanonOps · Tri-Force 3.0.0",
    teach: "Explore / Summarize / Investigate. Chat-PASS is not acceptance.",
  },
] as const;

export type AuthoringChapterId = (typeof AUTHORING_CHAPTERS)[number]["id"] | "all";

export type AtlasReadout = {
  embodiment: string;
  klass: string;
  take: string;
  shot: string;
  writer: string;
  ruler: string;
  weight: string;
  plant: string;
  settle: string;
  mesh: string;
};

export function AuthoringAtlas({
  chapter,
  onChapter,
  readout,
}: {
  chapter: AuthoringChapterId;
  onChapter: (id: AuthoringChapterId) => void;
  readout: AtlasReadout;
}): ReactElement {
  const active =
    chapter === "all"
      ? {
          outcome: "Every organ visible. Use this to audit, not to perform.",
          teach: "All is the mixer. Chapters are the instrument. Recede, never hide.",
          organ: "Full rail · no focus",
        }
      : (AUTHORING_CHAPTERS.find((c) => c.id === chapter) ?? AUTHORING_CHAPTERS[0]);
  return (
    <section
      className="dais-control-rail__section authoring-atlas"
      data-testid="authoring-atlas"
      data-chapter="atlas"
    >
      <p className="dais-control-rail__label">How to author</p>
      <div className="authoring-atlas__chips" role="tablist" aria-label="Authoring chapters">
        {AUTHORING_CHAPTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={chapter === c.id}
            data-testid={`atlas-chapter-${c.id}`}
            data-active={chapter === c.id ? "1" : "0"}
            onClick={() => onChapter(c.id)}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={chapter === "all"}
          data-testid="atlas-chapter-all"
          data-active={chapter === "all" ? "1" : "0"}
          onClick={() => onChapter("all")}
        >
          All
        </button>
      </div>
      <p className="authoring-atlas__teach" data-testid="atlas-teach">
        <strong>{active.outcome}</strong>
        <span>{active.teach}</span>
        <em>{active.organ}</em>
      </p>
      <dl className="authoring-atlas__readout" data-testid="atlas-readout">
        <div>
          <dt>Body</dt>
          <dd>{readout.embodiment}</dd>
        </div>
        <div>
          <dt>Class</dt>
          <dd>{readout.klass}</dd>
        </div>
        <div>
          <dt>Take</dt>
          <dd>{readout.take}</dd>
        </div>
        <div>
          <dt>Shot</dt>
          <dd>{readout.shot}</dd>
        </div>
        <div>
          <dt>Writer</dt>
          <dd>{readout.writer}</dd>
        </div>
        <div>
          <dt>Ruler</dt>
          <dd>{readout.ruler}</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>{readout.weight}</dd>
        </div>
        <div>
          <dt>Plant</dt>
          <dd>{readout.plant}</dd>
        </div>
        <div>
          <dt>Settle</dt>
          <dd>{readout.settle}</dd>
        </div>
        <div>
          <dt>Mesh</dt>
          <dd>{readout.mesh}</dd>
        </div>
      </dl>
    </section>
  );
}
