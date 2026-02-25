import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  /** The role required to access the children routes */
  requiredRole: UserRole;
}

/**
 * Wrapper component that protects routes based on authentication and role.
 *
 * - Shows a loading spinner while the auth check is in progress.
 * - Redirects unauthenticated users to the login page.
 * - Redirects users with the wrong role to their respective start page.
 * - Renders the child routes (via Outlet) when authorized.
 */
export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { authenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Lade...</div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  // Wrong role - redirect to the start page for their actual role
  if (role !== requiredRole) {
    if (role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/polls" replace />;
  }

  return <Outlet />;
}
