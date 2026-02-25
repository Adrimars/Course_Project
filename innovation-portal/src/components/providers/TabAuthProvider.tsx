'use client';

/**
 * TabAuthProvider + useTabSession
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides per-browser-tab session isolation using sessionStorage.
 *
 * Why sessionStorage?
 * • sessionStorage is scoped to a single browser tab — each tab gets its own
 *   storage area.  Unlike cookies (shared across all tabs in a profile) or
 *   localStorage (shared across all tabs), sessionStorage lets Tab A be logged
 *   in as user1 while Tab B is simultaneously logged in as admin.
 *
 * Architecture
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. On successful login, LoginForm calls POST /api/auth/tab-login, stores the
 *    returned JWT in sessionStorage('tab-auth-token').
 * 2. This provider reads that token on mount, decodes it (client-side, no crypto
 *    needed — the server validates on API requests), and exposes the user object.
 * 3. Components that need the current user call `useTabSession()`.
 * 4. When making fetch requests, include the token as
 *    `Authorization: Bearer <token>`.  The helper `getAuthHeaders()` does this.
 * 5. Logging out clears the sessionStorage entry and nulls the user state.
 *
 * The NextAuth cookie session is kept for backward-compatible SSR page
 * rendering.  The tab-token layer gives per-tab isolation at the client /
 * client-API level without requiring every server component to be rewritten.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'tab-auth-token';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TabUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface TabAuthContextValue {
  /** Decoded user for the current tab, or `null` when not authenticated. */
  user: TabUser | null;
  /** `true` while the provider is reading sessionStorage on first render. */
  isLoading: boolean;
  /**
   * Store a new JWT from /api/auth/tab-login and update the context.
   * Called by LoginForm after a successful credential check.
   */
  login: (token: string) => void;
  /**
   * Remove the tab-session token and clear the user state.
   * Does NOT clear the NextAuth cookie — call `signOut()` separately for a
   * full NextAuth logout if needed.
   */
  logout: () => void;
  /**
   * Returns the `Authorization: Bearer` header object for use with `fetch`.
   * Returns an empty object when the tab has no active session.
   */
  getAuthHeaders: () => Record<string, string>;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Decode the payload of a JWT without verifying the signature (client-safe). */
function decodeJwtPayload(token: string): TabUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → Base64 → JSON
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as Record<string, unknown>;
    const { id, email, name, role, exp } = payload as {
      id?: string;
      email?: string;
      name?: string;
      role?: string;
      exp?: number;
    };
    if (!id || !email || !name || !role) return null;
    // Reject expired tokens
    if (exp && exp * 1000 < Date.now()) return null;
    return { id, email, name, role };
  } catch {
    return null;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const TabAuthContext = createContext<TabAuthContextValue>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  getAuthHeaders: () => ({}),
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function TabAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TabUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from sessionStorage on first client render
  useEffect(() => {
    const token = sessionStorage.getItem(STORAGE_KEY);
    if (token) {
      const decoded = decodeJwtPayload(token);
      if (decoded) {
        setUser(decoded);
      } else {
        // Token is invalid / expired — clean up
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string) => {
    const decoded = decodeJwtPayload(token);
    if (!decoded) {
      console.error('[TabAuth] Received an invalid or expired token');
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, token);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = sessionStorage.getItem(STORAGE_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, getAuthHeaders }),
    [user, isLoading, login, logout, getAuthHeaders],
  );

  return (
    <TabAuthContext.Provider value={value}>{children}</TabAuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the current tab's session.
 *
 * ```tsx
 * const { user, login, logout, getAuthHeaders } = useTabSession();
 *
 * // Pass auth headers to any fetch call:
 * const res = await fetch('/api/ideas', { headers: getAuthHeaders() });
 * ```
 */
export function useTabSession(): TabAuthContextValue {
  return useContext(TabAuthContext);
}
