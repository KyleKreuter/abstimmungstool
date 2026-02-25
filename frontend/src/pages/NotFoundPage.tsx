import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Seite nicht gefunden</p>
      <Link to="/" className="underline hover:no-underline">
        Zurück zur Startseite
      </Link>
    </div>
  );
}
