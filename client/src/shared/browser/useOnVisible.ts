import { useEffect, useRef } from "react";

/**
 * Calls `onVisible` when the returned element scrolls into view (a little before it does), and
 * again after every re-render while it stays visible and `enabled`. Without IntersectionObserver
 * nothing happens, so the element should stay usable as a plain button.
 */
export function useOnVisible<T extends Element>(onVisible: () => void, enabled: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisible();
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, onVisible]);

  return ref;
}
