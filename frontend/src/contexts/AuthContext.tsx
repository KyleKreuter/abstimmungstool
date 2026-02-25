import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { get, post, ApiError } from "@/lib/api";
import type { AuthMeResponse, AuthResponse, UserRole } from "@/lib/types";

// ============================================================
// Auth State
// ============================================================

interface AuthState {
  authenticated: boolean;
  role: UserRole | null;
  votingCodeId: number | null;
  pollGroupId: number | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  /** Login as a participant using a voting code */
  loginParticipant: (code: string) => Promise<void>;
  /** Login as an admin using username and password */
  loginAdmin: (username: string, password: string) => Promise<void>;
  /** Logout the current user */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    role: null,
    votingCodeId: null,
    pollGroupId: null,
    loading: true,
  });

  // Check existing session on mount
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const data = await get<AuthMeResponse>("/api/auth/me");

        if (!cancelled && data.authenticated) {
          setState({
            authenticated: true,
            role: data.role ?? null,
            votingCodeId: data.votingCodeId ?? null,
            pollGroupId: data.pollGroupId ?? null,
            loading: false,
          });
        } else if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        // 401 or network error - user is not authenticated
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const loginParticipant = useCallback(async (code: string) => {
    const data = await post<AuthResponse>("/api/auth/participant/login", {
      code,
    });

    // After successful login, fetch full session info
    const me = await get<AuthMeResponse>("/api/auth/me");

    setState({
      authenticated: true,
      role: (data.role as UserRole) ?? me.role ?? "PARTICIPANT",
      votingCodeId: me.votingCodeId ?? null,
      pollGroupId: me.pollGroupId ?? null,
      loading: false,
    });
  }, []);

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      const data = await post<AuthResponse>("/api/auth/admin/login", {
        username,
        password,
      });

      setState({
        authenticated: true,
        role: (data.role as UserRole) ?? "ADMIN",
        votingCodeId: null,
        pollGroupId: null,
        loading: false,
      });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await post("/api/auth/logout");
    } catch (error) {
      // If logout fails with a network error, still clear local state.
      // Re-throw only unexpected errors.
      if (error instanceof ApiError && error.status >= 500) {
        throw error;
      }
    }

    setState({
      authenticated: false,
      role: null,
      votingCodeId: null,
      pollGroupId: null,
      loading: false,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loginParticipant,
      loginAdmin,
      logout,
    }),
    [state, loginParticipant, loginAdmin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================
// Hook
// ============================================================

/**
 * Access the current authentication state and actions.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
