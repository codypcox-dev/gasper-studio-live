import React from "react";
import { createRoot } from "react-dom/client";
import { GasperStudioApp } from "./GasperStudioApp";
import { installLocalServiceFetchBridge } from "../../desktop/src/api/local-service-fetch";
import { bootstrapPackagedIdentity } from "./operational/identities";
import "../../desktop/src/studio/tokens.css";
import "../../desktop/src/styles.css";
import "../../desktop/src/studio/shell.css";
import "./modes/mode-shell.css";

// Optional: if AgentBridge is up, fetch bridge works; if not, Studio still runs.
try {
  installLocalServiceFetchBridge();
} catch {
  /* standalone without bridge */
}

/**
 * GASPER-007 DOPS-01A: identity globals must be set *before* bridge registration.
 * Native injects PID + build_id; meta/env stamp complements for frontend build id.
 */
async function boot() {
  try {
    const id = await bootstrapPackagedIdentity();
    try {
      document.documentElement.setAttribute("data-frontend-build", id.build_id);
      document.documentElement.setAttribute("data-process-id", String(id.process_id));
      document.body?.setAttribute("data-frontend-build", id.build_id);
      document.body?.setAttribute("data-process-id", String(id.process_id));
      document.body?.setAttribute("data-packaged", id.packaged ? "true" : "false");
    } catch {
      /* */
    }
  } catch (e) {
    console.error("[gasper-studio] identity bootstrap failed", e);
    // Still mount for browser lab; packaged shell should not reach here without injection.
  }

  // Surface stamped build identity for acceptance probes.
  try {
    const meta = document.querySelector('meta[name="gasper-frontend-build"]');
    const fromAttr = document.documentElement.getAttribute("data-frontend-build");
    const id = meta?.getAttribute("content") || fromAttr;
    if (id) {
      document.documentElement.setAttribute("data-frontend-build", id);
      document.body?.setAttribute("data-frontend-build", id);
    }
  } catch {
    /* */
  }

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <GasperStudioApp />
    </React.StrictMode>,
  );
}

void boot();
