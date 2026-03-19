import { useEffect, useState } from "react";
import { get, ApiError } from "@/lib/api";
import type { VoteResponse } from "@/lib/types";
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

  // Group votes by pollId for multi-vote display
  const groupedVotes = votes.reduce<Record<number, VoteResponse[]>>(
    (acc, vote) => {
      (acc[vote.pollId] ??= []).push(vote);
      return acc;
    },
    {}
  );

  const pollEntries = Object.values(groupedVotes);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Meine Stimmen</h1>

      {pollEntries.length === 0 ? (
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
            {pollEntries.map((pollVotes) => (
              <TableRow key={pollVotes[0].pollId}>
                <TableCell className="font-medium">
                  {pollVotes[0].pollTitle}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {pollVotes.map((v) => (
                      <Badge key={v.optionId} variant="outline">
                        {v.optionLabel}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(pollVotes[0].votedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
