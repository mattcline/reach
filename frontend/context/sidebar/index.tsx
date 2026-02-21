'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { capitalizeFirstLetter } from 'lib/utils/text';

interface SidebarContext {
  activeItem: string;
  setActiveItem: React.Dispatch<React.SetStateAction<string>>;
}

const SidebarContext = React.createContext<SidebarContext | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>('');

  useEffect(() => {
    // get the active tab from the url
    const pathParts = pathname.split('/');
    if (pathParts.length < 3) return;
    setActiveItem(capitalizeFirstLetter(pathParts[2]));
  }, [pathname]);

  return (
    <SidebarContext.Provider value={{ activeItem, setActiveItem }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}