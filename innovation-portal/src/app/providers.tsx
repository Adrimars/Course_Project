'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { TabAuthProvider } from '@/components/providers/TabAuthProvider';

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider>
      {/* TabAuthProvider must be inside NextAuthSessionProvider so that
          useTabSession and useSession are both available to child components. */}
      <TabAuthProvider>{children}</TabAuthProvider>
    </NextAuthSessionProvider>
  );
}
