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

/**
 * Configuration for status transition actions.
 * Each entry maps the current status to the next status with labels.
 */
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

/**
 * Poll detail page showing all poll information, admin notes,
 * status transition controls, and results when published.
 */
export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pollId = Number(id);

  // ── Data fetching ──────────────────────────────────────────
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

  // Initialize live results from poll data
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
          setLiveResults({
            yesCount: event.yesCount,
            noCount: event.noCount,
            abstainCount: event.abstainCount,
            totalCount: event.totalVotes,
          });
        });
      } catch {
        connect(() => {
          try {
            subscriptionRef.current = subscribePollVotes(pollId, (event: PollVoteEvent) => {
              setLiveResults({
                yesCount: event.yesCount,
                noCount: event.noCount,
                abstainCount: event.abstainCount,
                totalCount: event.totalVotes,
              });
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

  // Sync notes from poll data on load
  useEffect(() => {
    if (poll && !notesInitialized.current) {
      setNotes(poll.notes ?? "");
      notesInitialized.current = true;
    }
  }, [poll]);

  // Reset on ID change
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

  // ── Delete poll ──────────────────────────────────────────
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

  // ── Loading & Error ────────────────────────────────────────
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
      {/* ── Header ───────────────────────────────────────────── */}
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
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={poll.status} />
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

      {/* ── Description ──────────────────────────────────────── */}
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

      {/* ── Results (OPEN, CLOSED, PUBLISHED) ─────────────────── */}
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

      {/* ── Admin Notes ──────────────────────────────────────── */}
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

      {/* ── Dialogs ──────────────────────────────────────────── */}
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

interface ResultsDisplayProps {
  results: PollResultResponse;
}

/**
 * Displays poll results as a summary grid with vote counts and percentages.
 */
function ResultsDisplay({ results }: ResultsDisplayProps) {
  const { yesCount, noCount, abstainCount, totalCount } = results;

  function percent(count: number): string {
    if (totalCount === 0) return "0";
    return ((count / totalCount) * 100).toFixed(1);
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <ResultCard label="Ja" count={yesCount} percentage={percent(yesCount)} color="text-foreground" />
      <ResultCard label="Nein" count={noCount} percentage={percent(noCount)} color="text-foreground" />
      <ResultCard label="Enthaltung" count={abstainCount} percentage={percent(abstainCount)} color="text-foreground" />
      <ResultCard label="Gesamt" count={totalCount} percentage="" color="text-foreground" />
    </div>
  );
}

interface ResultCardProps {
  label: string;
  count: number;
  percentage: string;
  color: string;
}

function ResultCard({ label, count, percentage, color }: ResultCardProps) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      {percentage && (
        <p className="text-xs text-muted-foreground">{percentage}%</p>
      )}
    </div>
  );
}
