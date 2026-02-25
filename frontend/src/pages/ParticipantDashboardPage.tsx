import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { get, post, put, ApiError } from "@/lib/api";
import {
  connect,
  disconnect,
  subscribePollStatus,
} from "@/lib/websocket";
import type {
  ParticipantPollResponse,
  VoteOption,
  VoteResponse,
  PollStatusEvent,
} from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function ParticipantDashboardPage() {
  const [polls, setPolls] = useState<ParticipantPollResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    pollId: number;
    pollTitle: string;
    option: VoteOption;
    isChange: boolean;
  }>({ open: false, pollId: 0, pollTitle: "", option: "YES", isChange: false });

  const [submitting, setSubmitting] = useState(false);

  // Track if component is mounted for cleanup
  const mountedRef = useRef(true);

  const fetchPolls = useCallback(async () => {
    try {
      const data = await get<ParticipantPollResponse[]>("/api/polls");
      if (mountedRef.current) {
        setPolls(data);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Abstimmungen konnten nicht geladen werden";
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load and WebSocket setup
  useEffect(() => {
    mountedRef.current = true;

    fetchPolls();

    // Connect to WebSocket and subscribe to poll status changes
    connect(
      () => {
        subscribePollStatus((_event: PollStatusEvent) => {
          // Refetch polls when any poll status changes
          void fetchPolls();
        });
      },
      (error) => {
        console.error("[ParticipantDashboard] WebSocket error:", error);
      }
    );

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [fetchPolls]);

  /**
   * Open the confirmation dialog before casting or changing a vote.
   */
  function handleVoteClick(poll: ParticipantPollResponse, option: VoteOption) {
    setConfirmDialog({
      open: true,
      pollId: poll.id,
      pollTitle: poll.title,
      option,
      isChange: poll.myVote !== null,
    });
  }

  /**
   * Submit the vote after user confirms.
   */
  async function handleVoteConfirm() {
    const { pollId, option, isChange } = confirmDialog;
    setSubmitting(true);

    try {
      if (isChange) {
        await put<VoteResponse>(`/api/polls/${pollId}/vote`, { option });
        toast.success("Stimme geändert");
      } else {
        await post<VoteResponse>(`/api/polls/${pollId}/vote`, { option });
        toast.success("Stimme abgegeben");
      }

      // Update the local poll state
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId ? { ...p, myVote: option } : p))
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Stimme konnte nicht abgegeben werden";
      toast.error(message);
    } finally {
      setSubmitting(false);
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Abstimmungen</h1>
        <p className="text-muted-foreground">Lade Abstimmungen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Abstimmungen</h1>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Abstimmungen</h1>

      {polls.length === 0 ? (
        <Alert>
          <AlertDescription>Keine Abstimmungen verfügbar</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVoteClick}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abstimmung bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du bei &quot;{confirmDialog.pollTitle}&quot; mit{" "}
              <strong>{VOTE_LABELS[confirmDialog.option]}</strong> abstimmen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoteConfirm}
              disabled={submitting}
            >
              {submitting ? "Wird gesendet..." : "Bestätigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Poll Card Component
// ============================================================

interface PollCardProps {
  poll: ParticipantPollResponse;
  onVote: (poll: ParticipantPollResponse, option: VoteOption) => void;
}

function PollCard({ poll, onVote }: PollCardProps) {
  const isOpen = poll.status === "OPEN";
  const isPublished = poll.status === "PUBLISHED";

  /** Truncate description to ~120 characters */
  const truncatedDescription =
    poll.description.length > 120
      ? poll.description.slice(0, 120) + "..."
      : poll.description;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{poll.title}</CardTitle>
          <Badge variant={isOpen ? "default" : "secondary"}>
            {isOpen ? "Offen" : "Veröffentlicht"}
          </Badge>
        </div>
        {truncatedDescription && (
          <CardDescription>{truncatedDescription}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        {/* Show current vote badge if voted */}
        {poll.myVote && (
          <div className="mb-3">
            <span className="text-sm text-muted-foreground mr-2">
              Deine Stimme:
            </span>
            <Badge variant={VOTE_BADGE_VARIANT[poll.myVote]}>
              {VOTE_LABELS[poll.myVote]}
            </Badge>
          </div>
        )}

        {/* Voting buttons for OPEN polls */}
        {isOpen && (
          <div className="flex gap-2">
            {(["YES", "NO", "ABSTAIN"] as VoteOption[]).map((option) => (
              <Button
                key={option}
                variant={poll.myVote === option ? "default" : "outline"}
                size="sm"
                onClick={() => onVote(poll, option)}
              >
                {VOTE_LABELS[option]}
              </Button>
            ))}
          </div>
        )}
      </CardContent>

      {/* Link to results for PUBLISHED polls */}
      {isPublished && (
        <CardFooter>
          <Button asChild variant="outline" size="sm">
            <Link to={`/polls/${poll.id}/results`}>Ergebnis anzeigen</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
