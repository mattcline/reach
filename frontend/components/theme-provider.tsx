"use client"
 
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { useState, useEffect } from "react";
 
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // https://github.com/shadcn-ui/ui/issues/5552#issuecomment-2437836976
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return null;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}