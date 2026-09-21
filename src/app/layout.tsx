import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multi-Market LMS Platform | Professional BIM Training',
  description: 'Custom modular multi-market Learning Management System for professional BIM training in Singapore and Malaysia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
