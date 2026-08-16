import { useCallback, useRef, useSyncExternalStore } from "react";
import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";

export function useAdapterSnapshot(adapter: WorldClassStudioAdapter): WorldClassStudioSnapshot {
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const subscribe = useCallback(
    (onStoreChange: () => void) => adapter.subscribe(onStoreChange),
    [adapter],
  );

  const getSnapshot = useCallback(() => adapterRef.current.getSnapshot(), []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
