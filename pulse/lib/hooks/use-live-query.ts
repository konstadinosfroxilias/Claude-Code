"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";
import { getServices, type Services } from "@/lib/services";

interface LiveQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Subscribes a fetcher to the service layer's change feed: runs on mount,
 * re-runs after every service write and whenever `deps` change. This is the
 * only data-fetching primitive UI components use — swap the services and
 * every screen keeps working.
 */
export function useLiveQuery<T>(
  fetcher: (svc: Services) => Promise<T>,
  deps: DependencyList = [],
): LiveQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);
  const fetcherRef = useRef(fetcher);
  const seqRef = useRef(0);

  // Keep the latest fetcher without re-subscribing (updated post-render).
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(async (initial: boolean) => {
    const seq = ++seqRef.current;
    if (initial) setLoading(true);
    try {
      const result = await fetcherRef.current(getServices());
      if (seq === seqRef.current) {
        setData(result);
        setError(undefined);
        setLoading(false);
      }
    } catch (e) {
      if (seq === seqRef.current) {
        setError(e);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    run(true);
    const unsubscribe = getServices().subscribe(() => run(false));
    return () => {
      unsubscribe();
      seqRef.current++; // invalidate in-flight results
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: () => run(false) };
}
