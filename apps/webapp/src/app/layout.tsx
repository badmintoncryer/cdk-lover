import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'CDK Lovers',
  description: 'Community session at AWS re:Invent',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
