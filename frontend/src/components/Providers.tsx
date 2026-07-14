'use client';

import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '../contexts/AuthContext';
import { BrandingProvider } from '../contexts/BrandingContext';
import { I18nProvider } from '../contexts/I18nContext';

export function Providers({ children }: { children: ReactNode }) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!hasClerk) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-lg p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Configuration Clerk</p>
          <h1 className="mt-2 text-2xl font-semibold">Clerk is not configured</h1>
          <p className="mt-2 text-sm text-slate-300">
            Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in Vercel, then redeploy the app.
          </p>
        </div>
      </div>
    );
  }

  const content = (
    <I18nProvider>
      <AuthProvider>
        <BrandingProvider>{children}</BrandingProvider>
      </AuthProvider>
    </I18nProvider>
  );

  if (demoMode) return content;

  return <ClerkProvider>{content}</ClerkProvider>;
}
