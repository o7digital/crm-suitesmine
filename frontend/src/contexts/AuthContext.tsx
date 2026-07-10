'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';
import { apiBaseForRequests } from '../lib/apiBase';

type User = {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  tenantName?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    tenantId?: string;
    tenantName: string;
    name: string;
    email: string;
    password: string;
    inviteToken?: string;
    legalCountry?: string;
    legalContractVersion?: string;
  }) => Promise<'signed-in' | 'confirm'>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function ClerkSessionSync({
  onSession,
  onSignedOut,
}: {
  onSession: (payload: { token: string; user: User }) => void;
  onSignedOut: () => void;
}) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();

  useEffect(() => {
    if (!clerkAuth.isLoaded || !clerkUser.isLoaded) return;
    if (!clerkAuth.userId || !clerkUser.user) {
      onSignedOut();
      return;
    }

    const metadata = (clerkUser.user.publicMetadata ?? {}) as Record<string, unknown>;
    const tenantId =
      (metadata.tenant_id as string | undefined) ||
      (metadata.tenantId as string | undefined) ||
      clerkAuth.userId;
    const tenantName =
      (metadata.tenant_name as string | undefined) || (metadata.tenantName as string | undefined);

    const mappedUser: User = {
      id: clerkAuth.userId,
      email: clerkUser.user.primaryEmailAddress?.emailAddress || '',
      name: clerkUser.user.fullName || clerkUser.user.firstName || clerkUser.user.username || 'User',
      tenantId,
      tenantName,
    };

    void clerkAuth.getToken().then((jwt) => {
      if (!jwt) return onSignedOut();
      const hasTenantMetadata = Boolean(
        metadata.tenant_id ||
          metadata.tenantId ||
          metadata.tenant_name ||
          metadata.tenantName,
      );
      if (!hasTenantMetadata) {
        void fetch('/api/clerk/sync-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            tenantName: tenantName || undefined,
          }),
        }).catch(() => {
          // Metadata sync is best-effort and should not block app session.
        });
      }
      onSession({ token: jwt, user: mappedUser });
    });
  }, [clerkAuth, clerkUser, onSession, onSignedOut]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const bootstrapTenant = useCallback(async (accessToken: string, opts?: { ignoreErrors?: boolean }) => {
    const apiBase = apiBaseForRequests();
    try {
      const res = await fetch(`${apiBase}/bootstrap`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) return;
      if (opts?.ignoreErrors) return;

      let extractedMessage = '';
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const payload = (await res.json()) as { message?: string | string[]; error?: string };
          if (typeof payload.message === 'string' && payload.message.trim()) extractedMessage = payload.message.trim();
          if (Array.isArray(payload.message) && payload.message.length > 0) {
            const joined = payload.message.filter((x) => typeof x === 'string').join('; ');
            if (joined) extractedMessage = joined;
          }
          if (!extractedMessage && typeof payload.error === 'string' && payload.error.trim()) {
            extractedMessage = payload.error.trim();
          }
        } catch {
          // Fallback below if payload parsing fails.
        }
      }
      throw new Error(extractedMessage || 'Unable to bootstrap workspace');
    } catch (err) {
      if (opts?.ignoreErrors) return;
      throw err instanceof Error ? err : new Error('Unable to bootstrap workspace');
    }
  }, []);

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      void email;
      void password;
      if (!hasClerk) throw new Error('Clerk configuration is missing');
      if (typeof window !== 'undefined') window.location.href = '/sign-in';
    },
    [hasClerk],
  );

  const register = useCallback(
    async (payload: {
      tenantId?: string;
      tenantName: string;
      name: string;
      email: string;
      password: string;
      inviteToken?: string;
      legalCountry?: string;
      legalContractVersion?: string;
    }) => {
      void payload;
      if (!hasClerk) throw new Error('Clerk configuration is missing');
      if (typeof window !== 'undefined') window.location.href = '/sign-up';
      return 'confirm' as const;
    },
    [hasClerk],
  );

  const clearAuthStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const logout = useCallback(async () => {
    if (hasClerk && typeof window !== 'undefined') window.location.href = '/sign-out';
    setToken(null);
    setUser(null);
    clearAuthStorage();
  }, [clearAuthStorage, hasClerk]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
    }),
    [loading, login, logout, register, token, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {hasClerk ? (
        <ClerkSessionSync
          onSession={({ token: nextToken, user: nextUser }) => {
            setToken(nextToken);
            setUser(nextUser);
            localStorage.setItem('token', nextToken);
            localStorage.setItem('user', JSON.stringify(nextUser));
            void bootstrapTenant(nextToken, { ignoreErrors: true });
          }}
          onSignedOut={() => {
            setToken(null);
            setUser(null);
            clearAuthStorage();
          }}
        />
      ) : null}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useApi(token: string | null) {
  return useMemo(() => {
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    return async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
      const requestUrl = `${apiBaseForRequests()}${path}`;
      const headers: Record<string, string> = { ...authHeader };
      if (!(init?.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }
      Object.assign(headers, init?.headers);

      // Avoid stale metrics when proxies/browsers cache API responses.
      const cache = init?.cache ?? 'no-store';
      const res = await fetch(requestUrl, {
        ...init,
        headers,
        cache,
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        let message = '';

        const extractMessage = (payload: unknown): string => {
          if (!payload) return '';
          if (typeof payload === 'string') return payload;
          if (typeof payload === 'object') {
            const obj = payload as Record<string, unknown>;
            const m = obj.message;
            if (typeof m === 'string') return m;
            if (Array.isArray(m)) {
              const parts = m.filter((x) => typeof x === 'string') as string[];
              if (parts.length) return parts.join('; ');
            }
            if (typeof obj.error === 'string') return obj.error;
          }
          try {
            return JSON.stringify(payload);
          } catch {
            return '';
          }
        };

        try {
          if (contentType.includes('application/json')) {
            message = extractMessage(await res.json());
          } else {
            const text = await res.text();
            message = text;
            try {
              message = extractMessage(JSON.parse(text));
            } catch {
              // keep raw text
            }
          }
        } catch {
          // ignore parsing errors and fall through
        }

        throw new Error(`${message || `Request failed (${res.status})`} [${res.status}] @ ${requestUrl}`);
      }
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('text/csv')) {
        return (await res.text()) as T;
      }
      return (await res.json()) as T;
    };
  }, [token]);
}
