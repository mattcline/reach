'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';

import { useUser } from 'context/user';

import { Form } from 'components/form';

import { FormField as IFormField } from 'types/form-field';

export function AccountInformation() {
  const [fields, setFields] = React.useState<IFormField[]>([]);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const getFields = async () => {
      if (!user) return;
      const url = `${BACKEND_URL}/user_profiles/${user.id}/editable_fields/?type=name`;
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
  }, [user, router]);

  const onSubmit = async (data: any, status: number) => {
    if (status === STATUS.HTTP_200_OK) {
      toast.success('Account information updated successfully.');
    } else {
      toast.error('Failed to update account information.');
    }
  }

  if (!user) return null;
  return (
    <div className="sm:max-w-xl mx-auto">
      <Form
        fields={fields}
        formURL={`${BACKEND_URL}/user_profiles/${user.id}/`}
        formMethod="PATCH"
        onSubmit={onSubmit}
        submitButtonText="Save"
      />
    </div>
  )
}