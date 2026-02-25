import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from './providers';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Innovation Portal',
  description: 'Submit and track your innovation ideas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
