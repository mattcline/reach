import 'app/globals.css';

import { Suspense } from 'react';
import { Spline_Sans } from 'next/font/google';

import { GlobalProvider } from 'context/global';
import { UserProvider } from 'context/user';
import { WebSocketsProvider } from 'context/web-sockets';
import { DialogProvider } from 'context/dialog';

import { ThemeProvider } from 'components/theme-provider';
import { Toaster } from 'components/ui/sonner';
import { Dialog } from 'components/dialog';
import { UserSelector } from 'components/user-selector';
import { Navbar } from 'components/navbar';

export const metadata = {
  title: 'Reach',
  description: 'Reach agreements'
}

const font = Spline_Sans({ weight: '400', subsets: ['latin'] });

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="title" content={metadata.title}></meta>
        <meta name="description" content={metadata.description}></meta>
      </head>
      <body className={`min-h-screen flex flex-col ${font.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense>
            <GlobalProvider>
              <UserProvider>
                <WebSocketsProvider>
                  <DialogProvider>
                    {/* <UserSelector /> */}
                    <Navbar />
                    <main className="flex-1 flex overflow-auto justify-center">
                      {children}
                    </main>
                    <Dialog />
                    <Toaster />
                  </DialogProvider>
                </WebSocketsProvider>
              </UserProvider>
            </GlobalProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}