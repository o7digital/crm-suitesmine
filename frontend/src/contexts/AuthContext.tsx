'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';
import { apiBaseForRequests } from '../lib/apiBase';
import { demoApiResponse, demoUser } from '../lib/demoData';

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
  const { isLoaded: authLoaded, userId, getToken } = useClerkAuth();
  const { isLoaded: userLoaded, user: clerkUser } = useClerkUser();
  const metadataSyncAttempted = useRef(false);

  useEffect(() => {
    if (!authLoaded || !userLoaded) return;
    if (!userId || !clerkUser) {
      onSignedOut();
      return;
    }

    const metadata = (clerkUser.publicMetadata ?? {}) as Record<string, unknown>;
    const tenantId =
      (metadata.tenant_id as string | undefined) ||
      (metadata.tenantId as string | undefined) ||
      userId;
    const tenantName =
      (metadata.tenant_name as string | undefined) || (metadata.tenantName as string | undefined);

    const mappedUser: User = {
      id: userId,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      name: clerkUser.fullName || clerkUser.firstName || clerkUser.username || 'User',
      tenantId,
      tenantName,
    };

    let cancelled = false;

    const syncSession = async () => {
      const jwt = await getToken();
      if (cancelled) return;
      if (!jwt) return onSignedOut();
      const hasTenantMetadata = Boolean(
        metadata.tenant_id ||
          metadata.tenantId ||
          metadata.tenant_name ||
          metadata.tenantName,
      );
      if (!hasTenantMetadata && !metadataSyncAttempted.current) {
        metadataSyncAttempted.current = true;
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
    };

    void syncSession().catch(onSignedOut);
    // Clerk session tokens are short-lived. Keep the API token fresh while the
    // page stays open instead of leaving the app with the token from sign-in.
    const refreshTimer = window.setInterval(() => {
      void syncSession().catch(onSignedOut);
    }, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [authLoaded, clerkUser, getToken, onSession, onSignedOut, userId, userLoaded]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const authSource = useRef<'local' | 'clerk' | null>(null);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
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
    let cancelled = false;

    async function restoreOrStartDemo() {
      let restored = false;

      // In production Clerk is the source of truth. Tokens left in localStorage
      // by the former demo mode must never be sent to the real API.
      if (hasClerk && !demoMode) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        if (!cancelled) {
          authSource.current = null;
          setToken(null);
          setUser(null);
        }
        return;
      }

      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser) as User;
            if (parsedUser?.id && parsedUser?.tenantId) {
              authSource.current = 'local';
              if (!cancelled) {
                setToken(storedToken);
                setUser(parsedUser);
              }
              restored = true;
            }
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      }

      if (!restored && demoMode) {
        const payload = { token: 'demo-token', user: demoUser };
        if (!cancelled) {
          authSource.current = 'local';
          setToken(payload.token);
          setUser(payload.user);
          localStorage.setItem('token', payload.token);
          localStorage.setItem('user', JSON.stringify(payload.user));
        }
      }

      if (!cancelled) setLoading(false);
    }

    void restoreOrStartDemo();

    return () => {
      cancelled = true;
    };
  }, [bootstrapTenant, demoMode, hasClerk]);

  const login = useCallback(
    async (email: string, password: string) => {
      const apiBase = apiBaseForRequests();
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      });
      if (!res.ok) {
        let message = 'Unable to login';
        try {
          const payload = (await res.json()) as { message?: string | string[]; error?: string };
          if (typeof payload.message === 'string') message = payload.message;
          if (Array.isArray(payload.message)) message = payload.message.join('; ');
          if (!payload.message && payload.error) message = payload.error;
        } catch {
          // Keep the generic message.
        }
        throw new Error(message);
      }

      const payload = (await res.json()) as { token: string; user: User };
      authSource.current = 'local';
      setToken(payload.token);
      setUser(payload.user);
      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.user));
      void bootstrapTenant(payload.token, { ignoreErrors: true });
    },
    [bootstrapTenant],
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
      if (demoMode) return 'signed-in' as const;
      if (!hasClerk) throw new Error('Clerk configuration is missing');
      if (typeof window !== 'undefined') window.location.href = '/sign-up';
      return 'confirm' as const;
    },
    [demoMode, hasClerk],
  );

  const clearAuthStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const logout = useCallback(async () => {
    const source = authSource.current;
    authSource.current = null;
    setToken(null);
    setUser(null);
    clearAuthStorage();
    if (source === 'clerk' && hasClerk && typeof window !== 'undefined') window.location.href = '/sign-out';
  }, [clearAuthStorage, hasClerk]);

  const handleClerkSession = useCallback(
    ({ token: nextToken, user: nextUser }: { token: string; user: User }) => {
      authSource.current = 'clerk';
      setToken(nextToken);
      setUser(nextUser);
      setLoading(false);
      localStorage.setItem('token', nextToken);
      localStorage.setItem('user', JSON.stringify(nextUser));
      void bootstrapTenant(nextToken, { ignoreErrors: true });
    },
    [bootstrapTenant],
  );

  const handleClerkSignedOut = useCallback(() => {
    authSource.current = null;
    setToken(null);
    setUser(null);
    setLoading(false);
    clearAuthStorage();
  }, [clearAuthStorage]);

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
      {hasClerk && !demoMode ? (
        <ClerkSessionSync
          onSession={handleClerkSession}
          onSignedOut={handleClerkSignedOut}
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
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    return async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
      if (demoMode) {
        return demoApiResponse(path, init) as T;
      }

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
