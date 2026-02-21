'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';
import { getFollowingPathStr, getSearchParam } from 'lib/utils/url';

import { useUser } from 'context/user';

import { Form } from 'components/form';

import { FormField as IFormField } from 'types/form-field';

export function EmailPreferences() {
  const [fields, setFields] = React.useState<IFormField[]>([]);
  const { user } = useUser();
  const router = useRouter();

  // token is used when user clicks 'Unsubscribe' link in email
  const searchParams = useSearchParams();
  const token = getSearchParam('token', searchParams);

  // get next path
  const nextPath = getFollowingPathStr(useSearchParams(), 'next=');

  useEffect(() => {
    const getFields = async () => {
      if (!user && !token) return;
      const url = user ? `${BACKEND_URL}/preferences/editable_fields/?type=email&user_id=${user.id}` : `${BACKEND_URL}/preferences/editable_fields/?type=email&token=${token}`;
      const { data, status } = await makeRequest({
        url,
        method: 'GET',
        accept: 'application/json'
      });
      if (status === STATUS.HTTP_200_OK && Array.isArray(data)) {
        const fields = data as IFormField[];
        setFields(fields);
      }
    }
    
    getFields();
  }, [user, token, router]);

  const onSubmit = async (data: any, status: number) => {
    if (status === STATUS.HTTP_200_OK) {
      toast.success('Email preferences updated successfully.');
    } else {
      toast.error('Failed to update preferences.');
    }
    if (nextPath) router.push(nextPath);
  }

  if (!user && !token) return null;
  return (
    <div className="flex items-center sm:max-w-xl mx-auto">
      <Form
        fields={fields}
        formURL={user ? `${BACKEND_URL}/preferences/${user.id}/` : `${BACKEND_URL}/preferences/update_preferences/?token=${token}`}
        formMethod="PATCH"
        onSubmit={onSubmit}
        submitButtonText="Save"
      />
    </div>
  )
}