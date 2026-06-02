import { useEffect, useRef } from 'react';

/**
 * Run `fn` immediately and then every `intervalMs`. The callback is kept in a
 * ref so the interval isn't recreated on every render. `deps` restarts polling.
 */
export function usePolling(fn: () => void, intervalMs: number, deps: unknown[] = []): void {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    saved.current();
    const interval = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
