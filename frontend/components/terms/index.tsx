'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from 'components/ui/scroll-area';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';
import data from 'lib/data/terms_fields.json';
import { useUser } from 'context/user';
import { useDialog } from 'context/dialog';
import { Form } from 'components/form';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';

export interface Terms {
  id: string;
  name: string;
  title?: string;
  text: string;
}

export function TermsDialog({
  name,
  documentId,
  onSubmit: onSubmitProp,
}: { 
  name: string,
  documentId: string,
  onSubmit?: (data: any, status: number) => void
}) {
  const router = useRouter();

  const { user, getAgreements } = useUser();
  const { setOpen } = useDialog();

  const [terms, setTerms] = useState<Terms | null>(null);

  useEffect(() => {
    getTerms(name);
  }, [name]);

  const getTerms = async (name: string) => {
    if (!name) return;
    const url = `${BACKEND_URL}/terms/?name=${name}&limit=1`; // get latest terms (there are multiple versions of terms)
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK && typeof data === 'object') {
      const results = (data as { results: object[] }).results;
      if (!results || results.length !== 1) return;
      const terms = results[0] as Terms;
      setTerms(terms);
    }
  }

  async function onClose() {
    router.replace('/docs');
    setOpen(false);
  }

  async function onSubmit(data: any, status: number) {
    if (status !== STATUS.HTTP_201_CREATED) return;

    setOpen(false);

    if (onSubmitProp) onSubmitProp(data, status);

    getAgreements(); // refresh agreements

    // allow dialog to close before resetting the loading state on the button
    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }

  if (!terms || !user) return null;
  return (
    <DialogContent
      onInteractOutside={(event: Event) => event.preventDefault()}
      showCloseButton={false}
      className="sm:max-w-2xl"
    >
      <DialogHeader>
        <DialogTitle>
          Terms
        </DialogTitle>
        <DialogDescription>
          Please scroll and read the terms before beginning a new offer.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea type="always" className="max-h-[50vh] border border-border rounded-md p-4">
        <div dangerouslySetInnerHTML={{ __html: terms.text }} />
      </ScrollArea>
      <Form
        fields={data.fields}
        formURL={`${BACKEND_URL}/agreements/`}
        formData={{
          terms: terms.id,
          user_profile: user.id,
          document: documentId,
        }}
        onSubmit={onSubmit}
        onCancel={onClose}
        submitButtonText="Agree and Continue"
        includeCancelButton={true}
      />
    </DialogContent>
  );
}