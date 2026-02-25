import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const { authenticated, role, loginParticipant, loading } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to the appropriate page
  if (!loading && authenticated) {
    if (role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/polls" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError("Bitte gib deinen Teilnahme-Code ein.");
      return;
    }

    setSubmitting(true);
    try {
      await loginParticipant(trimmedCode);
      navigate("/polls", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Anmeldung fehlgeschlagen.");
      } else {
        setError("Ein unerwarteter Fehler ist aufgetreten.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Abstimmungstool</CardTitle>
          <CardDescription>
            Gib deinen Teilnahme-Code ein, um an Abstimmungen teilzunehmen.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Teilnahme-Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Code eingeben"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={submitting}
                autoFocus
                autoComplete="off"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Wird angemeldet..." : "Anmelden"}
            </Button>

            <Button variant="link" asChild className="h-auto p-0">
              <Link to="/admin/login">Admin-Anmeldung</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
