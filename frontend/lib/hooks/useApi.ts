import { useState, useCallback } from 'react';

export function useApi<T>(requestFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await requestFn();
      setData(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error("Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  }, [requestFn]);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, error, loading, run, clear };
}