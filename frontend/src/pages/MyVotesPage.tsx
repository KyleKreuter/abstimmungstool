import { useEffect, useState } from "react";
import { get, ApiError } from "@/lib/api";
import type { VoteOption, VoteResponse } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Map vote option to German label */
const VOTE_LABELS: Record<VoteOption, string> = {
  YES: "Ja",
  NO: "Nein",
  ABSTAIN: "Enthaltung",
};

/** Map vote option to badge variant */
const VOTE_BADGE_VARIANT: Record<VoteOption, "default" | "secondary" | "outline"> = {
  YES: "default",
  NO: "secondary",
  ABSTAIN: "outline",
};

/**
 * Format an ISO date string to a localized German date/time string.
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyVotesPage() {
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchVotes() {
      try {
        const data = await get<VoteResponse[]>("/api/my-votes");
        if (!cancelled) {
          setVotes(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Stimmen konnten nicht geladen werden";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchVotes();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Meine Stimmen</h1>
        <p className="text-muted-foreground">Lade Stimmen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Meine Stimmen</h1>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Meine Stimmen</h1>

      {votes.length === 0 ? (
        <Alert>
          <AlertDescription>
            Du hast noch an keiner Abstimmung teilgenommen.
          </AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abstimmung</TableHead>
              <TableHead>Stimme</TableHead>
              <TableHead>Zeitpunkt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {votes.map((vote) => (
              <TableRow key={vote.pollId}>
                <TableCell className="font-medium">
                  {vote.pollTitle}
                </TableCell>
                <TableCell>
                  <Badge variant={VOTE_BADGE_VARIANT[vote.option]}>
                    {VOTE_LABELS[vote.option]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(vote.votedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
