'use client';

import { toast } from 'sonner';

import { convertCharToSpacesAndCapitalize } from 'lib/utils/text';
import { useDialog } from 'context/dialog';
import { Button } from 'components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'components/ui/dialog';

export function ConfirmDialog({
  action,
  description,
  toastMessage,
  onConfirm: onConfirmProp,
  onCancel: onCancelProp
}: { 
  action: string,
  description?: string,
  toastMessage?: string,
  onConfirm: () => Promise<void>,
  onCancel: () => Promise<void>
}) {
  const { setOpen } = useDialog();

  async function onConfirm() {
    await onConfirmProp();
    setOpen(false);
    toast(toastMessage);

    // allow dialog to close before resetting the loading state on the button
    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }

  async function onCancel() {
    await onCancelProp();
    setOpen(false);
  }

  return (
    <DialogContent
      className="sm:max-w-sm"
      onCloseAutoFocus={onCancel}
    >
      <DialogHeader>
        <DialogTitle>
          Are you sure you&apos;d like to {action}?
        </DialogTitle>
        <DialogDescription>
          { description }
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
        >
          { convertCharToSpacesAndCapitalize(action, '_') }
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}