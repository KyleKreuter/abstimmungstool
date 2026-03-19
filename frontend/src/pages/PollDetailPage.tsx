import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import PollDialog from "@/components/PollDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  fetchPoll,
  fetchAllGroups,
  updatePoll,
  updatePollStatus,
  updatePollNotes,
  deletePoll,
} from "@/lib/admin-api";
import {
  connect,
  isConnected,
  subscribePollVotes,
} from "@/lib/websocket";
import { formatDate } from "@/lib/format";
import type {
  PollStatus,
  PollVoteEvent,
  PollResultResponse,
} from "@/lib/types";

const POLL_TYPE_LABELS = {
  SIMPLE: "Einfache Abstimmung",
  PERSON_ELECTION: "Personenwahl",
  MULTI_VOTE: "Mehrfachauswahl",
};

const STATUS_TRANSITIONS: Partial<
  Record<
    PollStatus,
    { nextStatus: PollStatus; label: string; confirmTitle: string; confirmDesc: string }
  >
> = {
  DRAFT: {
    nextStatus: "OPEN",
    label: "Abstimmung starten",
    confirmTitle: "Abstimmung starten",
    confirmDesc:
      "Möchten Sie die Abstimmung starten? Teilnehmer können dann abstimmen.",
  },
  OPEN: {
    nextStatus: "CLOSED",
    label: "Abstimmung schließen",
    confirmTitle: "Abstimmung schließen",
    confirmDesc:
      "Möchten Sie die Abstimmung schließen? Es können dann keine weiteren Stimmen abgegeben werden.",
  },
  CLOSED: {
    nextStatus: "PUBLISHED",
    label: "Ergebnis veröffentlichen",
    confirmTitle: "Ergebnis veröffentlichen",
    confirmDesc:
      "Möchten Sie das Ergebnis veröffentlichen? Das Ergebnis wird für alle Teilnehmer sichtbar.",
  },
};

export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pollId = Number(id);

  const {
    data: poll,
    loading,
    error,
    refetch,
    setData: setPoll,
  } = useAsyncData(() => fetchPoll(pollId), [pollId]);

  const { data: groupsData } = useAsyncData(() => fetchAllGroups(), []);
  const groups = groupsData?.content ?? [];

  // ── WebSocket for live vote results ────────────────────────
  const [liveResults, setLiveResults] = useState<PollResultResponse | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    if (poll?.results) {
      setLiveResults(poll.results);
    }
  }, [poll?.results]);

  useEffect(() => {
    if (!poll || (poll.status !== "OPEN" && poll.status !== "CLOSED")) return;

    function setupSubscription() {
      try {
        subscriptionRef.current = subscribePollVotes(pollId, (event: PollVoteEvent) => {
          setLiveResults(event.results);
        });
      } catch {
        connect(() => {
          try {
            subscriptionRef.current = subscribePollVotes(pollId, (event: PollVoteEvent) => {
              setLiveResults(event.results);
            });
          } catch {
            // ignore
          }
        });
      }
    }

    if (isConnected()) {
      setupSubscription();
    } else {
      connect(() => setupSubscription());
    }

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [poll?.status, pollId]);

  // ── Notes state ────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const notesInitialized = useRef(false);

  useEffect(() => {
    if (poll && !notesInitialized.current) {
      setNotes(poll.notes ?? "");
      notesInitialized.current = true;
    }
  }, [poll]);

  useEffect(() => {
    notesInitialized.current = false;
  }, [pollId]);

  async function handleSaveNotes() {
    setNotesSaving(true);
    try {
      const updated = await updatePollNotes(pollId, notes);
      setPoll((prev) =>
        prev ? { ...prev, notes: updated.notes } : prev
      );
      toast.success("Notizen gespeichert");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Speichern"
      );
    } finally {
      setNotesSaving(false);
    }
  }

  // ── Edit dialog ────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditPoll = useCallback(
    async (data: { title: string; description: string }) => {
      await updatePoll(pollId, data);
      refetch();
      toast.success("Abstimmung aktualisiert");
    },
    [pollId, refetch]
  );

  // ── Status change ──────────────────────────────────────────
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  async function handleStatusChange() {
    if (!poll) return;
    const transition = STATUS_TRANSITIONS[poll.status];
    if (!transition) return;

    try {
      await updatePollStatus(pollId, transition.nextStatus);
      refetch();
      toast.success(`Status geändert: ${transition.label}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Statuswechsel"
      );
    }
    setStatusConfirmOpen(false);
  }

  // ── Delete poll ────────────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  async function handleDeletePoll() {
    try {
      await deletePoll(pollId);
      toast.success("Abstimmung gelöscht");
      navigate("/admin");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Löschen"
      );
    }
    setDeleteConfirmOpen(false);
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="rounded-lg border p-8 text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Abstimmung nicht gefunden</h1>
          <p className="text-muted-foreground">
            Die angeforderte Abstimmung existiert nicht oder wurde gelöscht.
          </p>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            &larr; Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const transition = STATUS_TRANSITIONS[poll.status];
  const displayResults =
    poll.status !== "DRAFT" ? (liveResults ?? poll.results) : null;

  const resultsTitle =
    poll.status === "PUBLISHED"
      ? "Ergebnis"
      : poll.status === "CLOSED"
        ? "Ergebnis (geschlossen)"
        : "Live-Ergebnis";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button
            variant="link"
            className="p-0 h-auto text-muted-foreground"
            onClick={() => navigate("/admin")}
          >
            &larr; Dashboard
          </Button>
          <h1 className="text-2xl font-bold">{poll.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <StatusBadge status={poll.status} />
            <Badge label={POLL_TYPE_LABELS[poll.type]} />
            <span>
              Gruppe:{" "}
              <Link
                to={`/admin/groups/${poll.groupId}`}
                className="underline hover:text-foreground"
              >
                {poll.groupName}
              </Link>
            </span>
            <span>Erstellt: {formatDate(poll.createdAt)}</span>
            <span>Aktualisiert: {formatDate(poll.updatedAt)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {poll.status === "DRAFT" && (
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
            >
              Bearbeiten
            </Button>
          )}
          {poll.status === "PUBLISHED" && (
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Löschen
            </Button>
          )}
          {transition && (
            <Button onClick={() => setStatusConfirmOpen(true)}>
              {transition.label}
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {poll.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beschreibung</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{poll.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Options (for non-SIMPLE in DRAFT) */}
      {poll.type !== "SIMPLE" && poll.status === "DRAFT" && poll.options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {poll.type === "PERSON_ELECTION" ? "Kandidaten" : "Optionen"}
              {poll.type === "MULTI_VOTE" && poll.maxChoices && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (max. {poll.maxChoices} wählbar)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {poll.options.map((o) => (
                <li key={o.id} className="text-sm">{o.label}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {displayResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{resultsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResultsDisplay results={displayResults} />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Admin Notes */}
      <div className="space-y-3">
        <Label htmlFor="admin-notes" className="text-base font-semibold">
          Admin-Notizen
        </Label>
        <Textarea
          id="admin-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interne Notizen (nur für Admins sichtbar)"
          rows={4}
          disabled={notesSaving}
        />
        <Button
          size="sm"
          onClick={handleSaveNotes}
          disabled={notesSaving}
        >
          {notesSaving ? "Speichern..." : "Notizen speichern"}
        </Button>
      </div>

      {/* Dialogs */}
      <PollDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        groups={groups}
        poll={poll}
        onSave={async (data) => {
          await handleEditPoll({
            title: data.title,
            description: data.description,
          });
        }}
      />

      {transition && (
        <ConfirmDialog
          open={statusConfirmOpen}
          onOpenChange={setStatusConfirmOpen}
          title={transition.confirmTitle}
          description={transition.confirmDesc}
          confirmLabel={transition.label}
          onConfirm={handleStatusChange}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Abstimmung löschen"
        description={`Möchten Sie die Abstimmung "${poll.title}" wirklich löschen? Alle zugehörigen Stimmen werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        onConfirm={handleDeletePoll}
        destructive
      />
    </div>
  );
}

// ================================================================
// Sub-components
// ================================================================

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}

interface ResultsDisplayProps {
  results: PollResultResponse;
}

function ResultsDisplay({ results }: ResultsDisplayProps) {
  const { totalVoters, optionResults } = results;

  function percent(count: number): string {
    if (totalVoters === 0) return "0";
    return ((count / totalVoters) * 100).toFixed(1);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {optionResults.map((opt) => (
          <ResultCard
            key={opt.optionId}
            label={opt.label}
            count={opt.count}
            percentage={percent(opt.count)}
          />
        ))}
        <ResultCard label="Gesamt" count={totalVoters} percentage="" />
      </div>
    </div>
  );
}

interface ResultCardProps {
  label: string;
  count: number;
  percentage: string;
}

function ResultCard({ label, count, percentage }: ResultCardProps) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{count}</p>
      {percentage && (
        <p className="text-xs text-muted-foreground">{percentage}%</p>
      )}
    </div>
  );
}
