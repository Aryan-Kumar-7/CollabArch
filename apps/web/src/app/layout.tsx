import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CollabArch — Real-Time Collaborative Architecture Canvas',
  description:
    'Distributed systems design studio with CRDT synchronization and interactive network traffic simulation engine.',
};

import { UserSyncProvider } from '@/components/auth/UserSyncProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  const stored = localStorage.getItem('collabarch_theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              `,
            }}
          />
        </head>
        <body className={`${inter.className} antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-200`}>
          <UserSyncProvider>
            {children}
          </UserSyncProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

