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

function percentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

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
  const widthPct = maxCount === 0 ? 0 : (count / maxCount) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm font-medium text-right shrink-0">
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

const BAR_COLORS = ["#333", "#666", "#888", "#aaa", "#bbb", "#ccc", "#ddd"];

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
        const [pollData, resultData] = await Promise.all([
          get<ParticipantPollResponse>(`/api/polls/${pollId}`),
          get<PollResultResponse>(`/api/polls/${pollId}/results`).catch(
            (err) => {
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
    ...results.optionResults.map((o) => o.count),
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
              {results.totalVoters} {results.totalVoters === 1 ? "Stimme" : "Stimmen"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {results.optionResults.map((opt, index) => (
            <ResultBar
              key={opt.optionId}
              label={opt.label}
              count={opt.count}
              total={results.totalVoters}
              maxCount={maxCount}
              color={BAR_COLORS[index % BAR_COLORS.length]}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
