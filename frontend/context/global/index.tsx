'use client';

import React, { useState } from 'react';

interface GlobalContext {
  dialog: React.ReactElement<any> | null;
  setDialog: React.Dispatch<React.SetStateAction<React.ReactElement<any> | null>>;
  editor: any;
  setEditor: any;
}

const GlobalContext = React.createContext<GlobalContext | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<React.ReactElement<any> | null>(null);
  const [editor, setEditor] = useState<any>(null);

  return (
    <GlobalContext.Provider value={{
      dialog,
      setDialog,
      editor,
      setEditor
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() {
  const context = React.useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
}