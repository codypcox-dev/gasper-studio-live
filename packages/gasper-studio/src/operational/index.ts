/**
 * Gasper Studio operational launch surface (F000 / ORBIT).
 * Identities, lifecycle, process ownership — single authority helpers.
 */

export {
  type AuthorityIdentities,
  type IdentitySource,
  ensureAuthorityIdentities,
  getAuthorityIdentities,
  requireAuthorityIdentities,
  bindRuntimeInstance,
  bindDocumentSession,
  assertBridgeRuntimeAligned,
  resetAuthorityIdentitiesForTests,
  authorityIdentitiesSnapshot,
  resolveNumericProcessId,
  resolveBuildId,
  bootstrapPackagedIdentity,
  isPackagedShell,
  shouldAutoStartAgentBridge,
} from "./identities";

export {
  type LifecycleState,
  type LifecycleTransitionReason,
  type OperationalReadiness,
  type LifecycleSnapshot,
  getLifecycle,
  subscribeLifecycle,
  canTransition,
  isOperationalReady,
  setReadiness,
  transitionLifecycle,
  deriveLifecycleTarget,
  applyDerivedLifecycle,
  resetLifecycleForTests,
  lifecycleAllowedMap,
} from "./lifecycle";

export {
  type ProcessOwner,
  type ProcessPurpose,
  type TrackedProcess,
  type ProcessOwnershipLedger,
  trackProcess,
  markTerminated,
  requestOwnedShutdown,
  listTrackedProcesses,
  runningOwnedProcesses,
  getProcessOwnershipLedger,
  resetProcessOwnershipForTests,
} from "./processOwnership";
