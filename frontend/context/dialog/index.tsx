'use client';

import React, { useEffect, useState } from 'react';

interface DialogContext {
  dialog: React.ReactElement<any> | null;
  setDialog: React.Dispatch<React.SetStateAction<React.ReactElement<any> | null>>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DialogContext = React.createContext<DialogContext | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<React.ReactElement<any> | null>(null);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    // open dialog whenever it is updated
    if (dialog) {
      setOpen(true);
    }
  }, [dialog]);

  return (
    <DialogContext.Provider value={{
      dialog,
      setDialog,
      open,
      setOpen
    }}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = React.useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}