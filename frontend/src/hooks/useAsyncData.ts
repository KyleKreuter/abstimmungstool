import { useState, useEffect, useCallback } from "react";

interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAsyncDataReturn<T> extends AsyncDataState<T> {
  /** Re-fetch data from the API */
  refetch: () => void;
  /** Manually set the data (e.g. after a mutation) */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Generic hook for loading data from an async function.
 * Handles loading, error, and data states with automatic fetch on mount
 * and a refetch function for manual refresh.
 *
 * @param fetchFn - Async function that returns the data
 * @param deps - Additional dependencies that trigger a refetch
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
): UseAsyncDataReturn<T> {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const [refreshCounter, setRefreshCounter] = useState(0);

  const refetch = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetchFn()
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Ein Fehler ist aufgetreten",
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCounter, ...deps]);

  const setData: React.Dispatch<React.SetStateAction<T | null>> = useCallback(
    (action) => {
      setState((prev) => ({
        ...prev,
        data: typeof action === "function"
          ? (action as (prev: T | null) => T | null)(prev.data)
          : action,
      }));
    },
    []
  );

  return { ...state, refetch, setData };
}
