import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { get, ApiError } from "@/lib/api";
import type {
  ParticipantPollResponse,
  PollResultResponse,
} from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Calculate the percentage of a count relative to a total.
 * Returns 0 if total is 0 to avoid division by zero.
 */
function percentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * A single horizontal bar in the result chart.
 */
function ResultBar({
  label,
  count,
  total,
  maxCount,
  color,
}: {
  label: string;
  count: number;
  total: number;
  maxCount: number;
  color: string;
}) {
  const pct = percentage(count, total);
  // Width proportional to the maximum count (so the largest bar fills 100%)
  const widthPct = maxCount === 0 ? 0 : (count / maxCount) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm font-medium text-right shrink-0">
        {label}
      </span>
      <div className="flex-1 h-8 bg-muted rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{
            width: `${widthPct}%`,
            backgroundColor: color,
            minWidth: count > 0 ? "4px" : "0",
          }}
        />
      </div>
      <span className="w-24 text-sm text-muted-foreground shrink-0">
        {count} ({pct}%)
      </span>
    </div>
  );
}

export default function PollResultsPage() {
  const { id } = useParams<{ id: string }>();
  const pollId = Number(id);

  const [poll, setPoll] = useState<ParticipantPollResponse | null>(null);
  const [results, setResults] = useState<PollResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        // Fetch poll details and results in parallel
        const [pollData, resultData] = await Promise.all([
          get<ParticipantPollResponse>(`/api/polls/${pollId}`),
          get<PollResultResponse>(`/api/polls/${pollId}/results`).catch(
            (err) => {
              // Results may not be available if not PUBLISHED
              if (err instanceof ApiError && err.status === 403) {
                return null;
              }
              throw err;
            }
          ),
        ]);

        if (!cancelled) {
          setPoll(pollData);
          setResults(resultData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Ergebnis konnte nicht geladen werden";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [pollId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Lade Ergebnis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/polls">Zurück zu Abstimmungen</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Poll loaded but not PUBLISHED - show info message
  if (poll && poll.status !== "PUBLISHED") {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">{poll.title}</h1>
        <Alert>
          <AlertDescription>
            Ergebnis noch nicht veröffentlicht
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/polls">Zurück zu Abstimmungen</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Results not available (shouldn't normally happen if status is PUBLISHED)
  if (!results || !poll) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Ergebnis noch nicht veröffentlicht
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/polls">Zurück zu Abstimmungen</Link>
          </Button>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(
    results.yesCount,
    results.noCount,
    results.abstainCount,
    1
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/polls">Zurück zu Abstimmungen</Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl">{poll.title}</CardTitle>
            <Badge variant="secondary">
              {results.totalCount} {results.totalCount === 1 ? "Stimme" : "Stimmen"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ResultBar
            label="Ja"
            count={results.yesCount}
            total={results.totalCount}
            maxCount={maxCount}
            color="#333"
          />
          <ResultBar
            label="Nein"
            count={results.noCount}
            total={results.totalCount}
            maxCount={maxCount}
            color="#888"
          />
          <ResultBar
            label="Enthaltung"
            count={results.abstainCount}
            total={results.totalCount}
            maxCount={maxCount}
            color="#ccc"
          />
        </CardContent>
      </Card>
    </div>
  );
}
