import { makeRequest, STATUS } from 'lib/utils/request';
import { BACKEND_URL } from 'lib/constants';
import { Subscription } from 'lib/types/billing';

export async function fetchSubscription(): Promise<Subscription> {
  const { data, status } = await makeRequest<{ subscription: Subscription }>({
    url: `${BACKEND_URL}/billing/subscription/`,
    method: 'GET',
    accept: 'application/json'
  });

  if (status !== STATUS.HTTP_200_OK || data?.subscription === undefined) {
    throw new Error('Failed to fetch subscription');
  }

  return data.subscription;
}