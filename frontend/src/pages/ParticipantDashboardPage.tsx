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

export default function ParticipantDashboardPage() {
  const [polls, setPolls] = useState<ParticipantPollResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    pollId: number;
    pollTitle: string;
    optionIds: number[];
    optionLabels: string[];
    isChange: boolean;
  }>({ open: false, pollId: 0, pollTitle: "", optionIds: [], optionLabels: [], isChange: false });

  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    mountedRef.current = true;
    fetchPolls();

    connect(
      () => {
        subscribePollStatus((event: PollStatusEvent) => {
          switch (event.status) {
            case "OPEN":
              toast.info("Neue Abstimmung verfügbar");
              break;
            case "CLOSED":
              toast("Abstimmung wurde geschlossen");
              break;
            case "PUBLISHED":
              toast.success("Ergebnis wurde veröffentlicht");
              break;
          }
          setPolls((prev) =>
            prev.map((p) =>
              p.id === event.pollId
                ? { ...p, status: event.status as ParticipantPollResponse["status"] }
                : p
            )
          );
          setTimeout(() => void fetchPolls(), 500);
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

  function handleVoteSubmit(
    poll: ParticipantPollResponse,
    optionIds: number[],
    optionLabels: string[]
  ) {
    setConfirmDialog({
      open: true,
      pollId: poll.id,
      pollTitle: poll.title,
      optionIds,
      optionLabels,
      isChange: poll.myVoteOptionIds !== null,
    });
  }

  async function handleVoteConfirm() {
    const { pollId, optionIds, isChange } = confirmDialog;
    setSubmitting(true);

    try {
      if (isChange) {
        await put(`/api/polls/${pollId}/vote`, { optionIds });
        toast.success("Stimme geändert");
      } else {
        await post(`/api/polls/${pollId}/vote`, { optionIds });
        toast.success("Stimme abgegeben");
      }

      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId ? { ...p, myVoteOptionIds: optionIds } : p
        )
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
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="container mx-auto px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-bold">Abstimmungen</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 pb-6">
          {polls.length === 0 ? (
            <Alert>
              <AlertDescription>Keine Abstimmungen verfügbar</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...polls].sort((a, b) => b.id - a.id).map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onVoteSubmit={handleVoteSubmit}
                />
              ))}
            </div>
          )}
        </div>
      </div>

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
              <strong>{confirmDialog.optionLabels.join(", ")}</strong> abstimmen?
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
  onVoteSubmit: (
    poll: ParticipantPollResponse,
    optionIds: number[],
    optionLabels: string[]
  ) => void;
}

function PollCard({ poll, onVoteSubmit }: PollCardProps) {
  const isOpen = poll.status === "OPEN";
  const isClosed = poll.status === "CLOSED";
  const isPublished = poll.status === "PUBLISHED";

  const truncatedDescription =
    poll.description && poll.description.length > 120
      ? poll.description.slice(0, 120) + "..."
      : poll.description;

  const statusLabel = isOpen ? "Offen" : isClosed ? "Geschlossen" : "Veröffentlicht";
  const badgeVariant = isOpen ? "default" : "secondary";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{poll.title}</CardTitle>
          <Badge variant={badgeVariant}>{statusLabel}</Badge>
        </div>
        {truncatedDescription && (
          <CardDescription>{truncatedDescription}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        {poll.myVoteOptionIds && poll.myVoteOptionIds.length > 0 && (
          <div className="mb-3">
            <span className="text-sm text-muted-foreground mr-2">
              Deine Stimme:
            </span>
            {poll.myVoteOptionIds.map((optId) => {
              const opt = poll.options.find((o) => o.id === optId);
              return (
                <Badge key={optId} variant="outline" className="mr-1">
                  {opt?.label ?? "?"}
                </Badge>
              );
            })}
          </div>
        )}

        {isOpen && (
          <VotingControls poll={poll} onVoteSubmit={onVoteSubmit} />
        )}

        {isClosed && (
          <p className="text-sm text-muted-foreground">
            Warten auf Ergebnisse...
          </p>
        )}
      </CardContent>

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

// ============================================================
// Voting Controls (per poll type)
// ============================================================

interface VotingControlsProps {
  poll: ParticipantPollResponse;
  onVoteSubmit: (
    poll: ParticipantPollResponse,
    optionIds: number[],
    optionLabels: string[]
  ) => void;
}

function VotingControls({ poll, onVoteSubmit }: VotingControlsProps) {
  if (poll.type === "SIMPLE") {
    return <SimpleVoting poll={poll} onVoteSubmit={onVoteSubmit} />;
  }
  if (poll.type === "PERSON_ELECTION") {
    return <PersonElectionVoting poll={poll} onVoteSubmit={onVoteSubmit} />;
  }
  return <MultiVoting poll={poll} onVoteSubmit={onVoteSubmit} />;
}

function SimpleVoting({ poll, onVoteSubmit }: VotingControlsProps) {
  return (
    <div className="flex gap-2">
      {poll.options.map((option) => (
        <Button
          key={option.id}
          variant={
            poll.myVoteOptionIds?.includes(option.id) ? "default" : "outline"
          }
          size="sm"
          onClick={() =>
            onVoteSubmit(poll, [option.id], [option.label])
          }
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function PersonElectionVoting({ poll, onVoteSubmit }: VotingControlsProps) {
  const [selected, setSelected] = useState<number | null>(
    poll.myVoteOptionIds?.[0] ?? null
  );

  function handleSubmit() {
    if (selected === null) return;
    const opt = poll.options.find((o) => o.id === selected);
    onVoteSubmit(poll, [selected], [opt?.label ?? "?"]);
  }

  return (
    <div className="space-y-2">
      {poll.options.map((option) => (
        <label
          key={option.id}
          className="flex items-center gap-2 cursor-pointer rounded-md border p-2 hover:bg-muted/50 transition-colors"
        >
          <input
            type="radio"
            name={`poll-${poll.id}`}
            checked={selected === option.id}
            onChange={() => setSelected(option.id)}
            className="accent-primary"
          />
          <span className="text-sm">{option.label}</span>
        </label>
      ))}
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={selected === null}
      >
        Abstimmen
      </Button>
    </div>
  );
}

function MultiVoting({ poll, onVoteSubmit }: VotingControlsProps) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(poll.myVoteOptionIds ?? [])
  );
  const max = poll.maxChoices ?? 1;

  function toggle(optionId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else if (next.size < max) {
        next.add(optionId);
      }
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const labels = ids.map(
      (id) => poll.options.find((o) => o.id === id)?.label ?? "?"
    );
    onVoteSubmit(poll, ids, labels);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Wähle bis zu {max} {max === 1 ? "Option" : "Optionen"} ({selected.size}/{max})
      </p>
      {poll.options.map((option) => (
        <label
          key={option.id}
          className="flex items-center gap-2 cursor-pointer rounded-md border p-2 hover:bg-muted/50 transition-colors"
        >
          <input
            type="checkbox"
            checked={selected.has(option.id)}
            onChange={() => toggle(option.id)}
            disabled={!selected.has(option.id) && selected.size >= max}
            className="accent-primary"
          />
          <span className="text-sm">{option.label}</span>
        </label>
      ))}
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={selected.size === 0}
      >
        Abstimmen
      </Button>
    </div>
  );
}
