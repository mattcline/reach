'use client';

import { useDialog } from 'context/dialog';
import { Dialog as DialogRoot } from 'components/ui/dialog';
import { useEffect } from 'react';

export function Dialog() {
  const {
    dialog,
    setDialog,
    open,
    setOpen
  } = useDialog();

  // TODO: when user selects back button, need to set the dialog to null
  // TODO: do we need this anymore?
  useEffect(() => {
    // reset dialog when this component mounts
    // because this component could be rendered
    // from a route that does not consume the
    // context required by the existing dialog
    setDialog(null);
  }, [setDialog]);

  if (!dialog) {
    return null;
  }
  return (
    <DialogRoot
      open={open}
      onOpenChange={setOpen}
    >
      {dialog}
    </DialogRoot>
  )
}