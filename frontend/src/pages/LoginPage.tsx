import { type FormEvent, useRef, useState } from "react";
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
import { CircleAlert } from "lucide-react";

function mapErrorMessage(err: ApiError): string {
  return err.message || "Ein Fehler ist aufgetreten. Bitte versuche es erneut.";
}

export default function LoginPage() {
  const { authenticated, role, loginParticipant, loading } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await loginParticipant(trimmedCode);
      navigate("/polls", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(mapErrorMessage(err));
      } else {
        setError("Ein unerwarteter Fehler ist aufgetreten.");
      }
      inputRef.current?.focus();
      inputRef.current?.select();
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
            <div className="space-y-2">
              <Label htmlFor="code">Teilnahme-Code</Label>
              <Input
                ref={inputRef}
                id="code"
                type="text"
                placeholder="Code eingeben"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
                disabled={submitting}
                autoFocus
                autoComplete="off"
                aria-invalid={!!error}
                aria-describedby={error ? "code-error" : undefined}
                className={error ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {error && (
                <p id="code-error" className="flex items-center gap-1.5 text-sm text-destructive">
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
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
