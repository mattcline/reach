'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';

import { useUser } from 'context/user';

export default function InvitePage(props: { params: Promise<{ id: string, token: string }> }) {
  const params = use(props.params);
  const token = params.token;

  const router = useRouter();

  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (userLoading || !user) return;
    acceptInvite();
  }, [user, userLoading]);

  const acceptInvite = async () => {
    const url = `${BACKEND_URL}/documents/${params.id}/accept-invite/`;
    const { data, status } = await makeRequest({ 
      url,
      method: 'POST',
      body: { token },
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK) {
      router.replace(`/docs/${params.id}`);
    } else {
      console.error('Failed to accept invite');
      router.replace(`/docs`);
    }
  }
}