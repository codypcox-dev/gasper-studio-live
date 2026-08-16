/**
 * P1-AUTOMATION-IDENTITY — canonical product control selectors.
 * Structural tests fail if any of these string tokens leave the shell source tree.
 */

/** Static testids that must appear in worldclass shell / gasper-studio product source. */
export const REQUIRED_GWC_TEST_IDS: readonly string[] = [
  // Shell chrome
  "gwc-shell-root",
  "gwc-app-bar",
  "gwc-body",
  "gwc-status",
  "gwc-status-msg",
  "gwc-status-playback",
  "gwc-status-timecode",
  "gwc-doc-revision",
  "status-revision",
  "gwc-status-content-hash",
  "gwc-status-workspace",
  "frontend-build-id",
  // Jobs
  "gwc-ws-operate",
  "gwc-ws-affect",
  "gwc-ws-form",
  "gwc-ws-motion",
  "gwc-ws-proof",
  // Document / operate actions
  "gwc-btn-new",
  "gwc-btn-open",
  "gwc-btn-save",
  "gwc-btn-undo",
  "gwc-btn-redo",
  "gwc-btn-reconnect",
  // Stage
  "gwc-stage-frame",
  "gwc-stage-slot",
  "gwc-stage-mode-author",
  "gwc-stage-mode-preview",
  "gwc-stage-mode-runtime",
  // Navigator / inspector
  "gwc-navigator",
  "gwc-inspector",
  "gwc-insp-search-input",
  // Timeline / motion
  "gwc-timeline",
  "gwc-playback-controls",
  "gwc-btn-play",
  "gwc-btn-interrupt",
  "gwc-btn-loop",
  "gwc-btn-zoom-in",
  "gwc-btn-zoom-out",
  "gwc-tl-ruler",
  "gwc-playhead-ruler",
  // Affect / proof
  "gwc-workspace-affect",
  "gwc-affect-compile-btn",
  "gwc-workspace-proof",
  "gwc-proof-export-btn",
  "gwc-proof-pin-btn",
  "gwc-proof-compare-btn",
  // Form / operate
  "gwc-workspace-form",
  "gwc-workspace-operate",
  "gwc-workspace-motion",
] as const;

/** Patterns for dynamic but required automation families. */
export const REQUIRED_GWC_TESTID_PATTERNS: readonly RegExp[] = [
  /gwc-nav-\$\{/,
  /gwc-track-mute-\$\{/,
  /gwc-track-solo-\$\{/,
  /gwc-track-lock-\$\{/,
  /gwc-kf-\$\{/,
  /gwc-insp-row-\$\{/,
  /gwc-insp-group-\$\{/,
  /gwc-domain-\$\{/,
];
