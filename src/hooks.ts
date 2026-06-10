import { useEffect, useRef } from 'react';

/**
 * Run `fn` immediately, then on every server "tick" (Server-Sent Events) for
 * near-instant updates, with a polling interval as a fallback when SSE isn't
 * available or a tick is missed. The callback is kept in a ref so the effect
 * isn't recreated on every render. `deps` restarts the subscription.
 */
export function usePolling(fn: () => void, intervalMs: number, deps: unknown[] = []): void {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    saved.current();
    const interval = setInterval(() => saved.current(), intervalMs);

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/stream');
      es.onmessage = () => saved.current();
    } catch {
      /* SSE unsupported — polling still covers it */
    }

    return () => {
      clearInterval(interval);
      es?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
