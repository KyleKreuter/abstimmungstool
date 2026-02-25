import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Application layout with a header bar showing the app name,
 * the current user role as a badge, and a logout button.
 * Renders nested routes via Outlet.
 */
export default function Layout() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const roleLabel = role === "ADMIN" ? "Admin" : "Teilnehmer";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Abstimmungstool</h1>

          <div className="flex items-center gap-3">
            <Badge variant="secondary">{roleLabel}</Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
