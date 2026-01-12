import { useEffect, useRef } from "react";
import { subscribeAppRefetch } from "../utils/AppRefetchBus";

type Options = {
  enabled?: boolean;
  debounceMs?: number;
};

export function useAutoReload(
  reloadFn: () => void | Promise<void>,
  options?: Options
) {
  const { enabled = true, debounceMs = 800 } = options || {};
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeAppRefetch(() => {
      const now = Date.now();
      if (now - lastRunRef.current < debounceMs) return;

      lastRunRef.current = now;
      reloadFn();
    });

    return unsubscribe;
  }, [enabled, debounceMs, reloadFn]);
}
