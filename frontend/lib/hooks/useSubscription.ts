import { useApi } from 'lib/hooks/useApi';
import { fetchSubscription } from 'lib/api/billing';

export function useSubscription() {
  const { data, error, loading, run, clear } = useApi(fetchSubscription);

  return { data, error, loading, refresh: run, clear };
}
