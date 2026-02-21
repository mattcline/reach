
'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { toast } from 'sonner';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';
import data from 'lib/data/start_review_fields.json';
import { useDocument } from 'context/document';
import { useDialog } from 'context/dialog';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from 'components/ui/alert';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Button } from 'components/ui/button';
import { Form } from 'components/form';
import { Document } from 'types/document';

export function StartReviewDialog({ doc, onSubmit }: { doc: Document | null, onSubmit: any; }) {
  const { setOpen } = useDialog();

  const share = async (id: string, email: string) => {
    try {
      const url = `${BACKEND_URL}/documents/${id}/share/`;
      const { data, status } = await makeRequest({
        url,
        method: 'POST',
        body: { email },
        accept: 'application/json'
      });
      if (status === STATUS.HTTP_200_OK) {
        toast.success(`Invitation sent to ${email}.`);
      }
    } catch (error) {
      toast.error(`Could not send invite.`);
    } finally {
      setOpen(false);
    }
  }

  return (
    <DialogContent 
      className="flex flex-col"
    >
      <DialogHeader>
        <DialogTitle>Start a Review</DialogTitle>
        <DialogDescription>
          Enter the email address of the reviewer.
        </DialogDescription>
        {/* <Alert variant="default" className="mt-3 mb-1">
          <Info />
          <AlertTitle>This will initiate a review &quot;freeze&quot; for all parties involved.</AlertTitle>
          <AlertDescription>
            During this time, the document will be locked to all parties for further edits.
          </AlertDescription>
        </Alert> */}
      </DialogHeader>
      <Form
        fields={data.fields}
        formURL={`${BACKEND_URL}/documents/`}
        formData={{
          root: doc?.root,
          title: `${doc?.title} - Review`
        }}
        submitButtonText={"Send"}
        onSubmit={(responseData, status, body) => {
          onSubmit(responseData, status);
          setOpen(false); // close dialog, might need to leave it open if it errors

          share(responseData.id, body.email);
        }}
        inlineSubmitButton
      />
      {/* <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Send</Button>
      </DialogFooter> */}
    </DialogContent>
  );
}