import { useEffect, useRef } from "react";
import { subscribeAppRefetch } from "../utils/AppRefetchBus";

type Options = {
  enabled?: boolean;
  debounceMs?: number;
};

export function useAutoReload(
  reloadFn: () => void | Promise<void>,
  options?: Options,
) {
  const { enabled = true, debounceMs = 800 } = options || {};

  const lastRunRef = useRef(0);
  const fnRef = useRef(reloadFn);

  // luôn giữ fn mới nhất
  fnRef.current = reloadFn;

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeAppRefetch(() => {
      const now = Date.now();
      if (now - lastRunRef.current < debounceMs) return;

      lastRunRef.current = now;
      fnRef.current(); // không dùng reloadFn trực tiếp
    });

    return unsubscribe;
  }, [enabled, debounceMs]);
}
