'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import data from 'lib/data/submit_offer.json';
import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';
import { useDialog } from 'context/dialog';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Form } from 'components/form';

export function SubmitOfferDialog({
  documentId,
  onSubmit: onSubmitProp,
  onCancel: onCancelProp,
}: {
  documentId: string,
  onSubmit: () => Promise<void>,
  onCancel: () => Promise<void>
}) {
  const { setOpen } = useDialog();

  const [promptEmail, setPromptEmail] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    async function getRecipient() {
      const url = `${BACKEND_URL}/documents/${documentId}/to_user/`;
      const { data, status } = await makeRequest({
        url,
        method: 'GET',
        accept: 'application/json'
      });
      if (status === STATUS.HTTP_200_OK && typeof data === 'object') {
        const recipient = data as { id: string };
        if (recipient.id === null) {
          // don't have a recipient, so ask for email
          setPromptEmail(true);
        }
      }
    }
    
    getRecipient();
  }, [documentId]);

  async function onSubmit(data: any, status: number) {
    await onSubmitProp();
    setOpen(false);
    toast('Offer submitted.');

    // allow dialog to close before resetting the loading state on the button
    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }

  async function onCancel() {
    await onCancelProp();
    setOpen(false);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Submit Offer
        </DialogTitle>
        <DialogDescription>
          {promptEmail ?
            "Provide the email address of the recipient below." : 
            "Are you sure you'd like to submit the offer?"
          }
        </DialogDescription>
      </DialogHeader>
      <Form
        fields={promptEmail ? data.fields : null}
        formURL={`${BACKEND_URL}/documents/${documentId}/submit/`}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitButtonText="Submit"
        includeCancelButton={true}
      />
    </DialogContent>
  );
}