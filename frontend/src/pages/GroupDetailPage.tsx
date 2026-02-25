import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import GroupDialog from "@/components/GroupDialog";
import PollDialog from "@/components/PollDialog";
import GenerateCodesDialog from "@/components/GenerateCodesDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  fetchGroup,
  fetchGroups,
  fetchPolls,
  fetchCodes,
  updateGroup,
  deleteGroup,
  createPoll,
  generateCodes,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PollResponse, VotingCodeResponse } from "@/lib/types";

/**
 * Group detail page showing group info, associated polls, and voting codes.
 * Provides actions for renaming, deleting, creating polls, and generating codes.
 */
export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const groupId = Number(id);

  // ── Data fetching ──────────────────────────────────────────
  const {
    data: group,
    loading: groupLoading,
    error: groupError,
    refetch: refetchGroup,
  } = useAsyncData(() => fetchGroup(groupId), [groupId]);

  const {
    data: groups,
  } = useAsyncData(fetchGroups);

  const {
    data: polls,
    loading: pollsLoading,
    refetch: refetchPolls,
  } = useAsyncData(() => fetchPolls(groupId), [groupId]);

  const {
    data: codes,
    loading: codesLoading,
    refetch: refetchCodes,
  } = useAsyncData(() => fetchCodes(groupId), [groupId]);

  // ── Rename dialog ──────────────────────────────────────────
  const [renameOpen, setRenameOpen] = useState(false);

  const handleRename = useCallback(
    async (name: string) => {
      await updateGroup(groupId, name);
      refetchGroup();
      toast.success("Gruppe umbenannt");
    },
    [groupId, refetchGroup]
  );

  // ── Delete dialog ──────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    try {
      await deleteGroup(groupId);
      toast.success("Gruppe gelöscht");
      navigate("/admin");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "Gruppe kann nicht gelöscht werden, da sie noch Abstimmungen oder Codes enthält."
        );
      } else {
        toast.error(
          err instanceof Error ? err.message : "Fehler beim Löschen"
        );
      }
    }
    setDeleteOpen(false);
  }

  // ── Poll dialog ────────────────────────────────────────────
  const [pollDialogOpen, setPollDialogOpen] = useState(false);

  const handleCreatePoll = useCallback(
    async (data: { title: string; description: string; groupId: number }) => {
      await createPoll(data.groupId, {
        title: data.title,
        description: data.description,
      });
      refetchPolls();
      refetchGroup();
      toast.success("Abstimmung erstellt");
    },
    [refetchPolls, refetchGroup]
  );

  // ── Generate codes dialog ─────────────────────────────────
  const [codesDialogOpen, setCodesDialogOpen] = useState(false);

  const handleGenerateCodes = useCallback(
    async (count: number) => {
      await generateCodes(groupId, count);
      refetchCodes();
      refetchGroup();
      toast.success(`${count} Code(s) generiert`);
    },
    [groupId, refetchCodes, refetchGroup]
  );

  // ── Copy code to clipboard ────────────────────────────────
  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Code kopiert");
    });
  }

  // ── Loading & Error ────────────────────────────────────────
  if (groupLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">
          Fehler: {groupError ?? "Gruppe nicht gefunden"}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="link"
            className="p-0 h-auto text-muted-foreground"
            onClick={() => navigate("/admin")}
          >
            &larr; Dashboard
          </Button>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            Erstellt am {formatDate(group.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRenameOpen(true)}>
            Umbenennen
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            Löschen
          </Button>
        </div>
      </div>

      {/* ── Polls section ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Abstimmungen ({group.pollCount})
          </h2>
          <Button size="sm" onClick={() => setPollDialogOpen(true)}>
            Neue Abstimmung
          </Button>
        </div>

        {pollsLoading ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : polls && polls.length > 0 ? (
          <PollsTable
            polls={polls}
            onPollClick={(poll) => navigate(`/admin/polls/${poll.id}`)}
          />
        ) : (
          <p className="py-4 text-center text-muted-foreground">
            Keine Abstimmungen in dieser Gruppe.
          </p>
        )}
      </section>

      {/* ── Codes section ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Abstimmungscodes ({group.codeCount})
          </h2>
          <Button size="sm" onClick={() => setCodesDialogOpen(true)}>
            Codes generieren
          </Button>
        </div>

        {codesLoading ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : codes && codes.length > 0 ? (
          <CodesTable codes={codes} onCopy={copyCode} />
        ) : (
          <p className="py-4 text-center text-muted-foreground">
            Keine Codes in dieser Gruppe.
          </p>
        )}
      </section>

      {/* ── Dialogs ──────────────────────────────────────────── */}
      <GroupDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onSave={handleRename}
        initialName={group.name}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Gruppe löschen"
        description={`Möchten Sie die Gruppe "${group.name}" wirklich löschen? Dies ist nur möglich, wenn die Gruppe leer ist.`}
        confirmLabel="Löschen"
        onConfirm={handleDelete}
        destructive
      />

      <PollDialog
        open={pollDialogOpen}
        onOpenChange={setPollDialogOpen}
        groups={groups ?? []}
        defaultGroupId={groupId}
        onSave={handleCreatePoll}
      />

      <GenerateCodesDialog
        open={codesDialogOpen}
        onOpenChange={setCodesDialogOpen}
        onGenerate={handleGenerateCodes}
      />
    </div>
  );
}

// ================================================================
// Sub-components
// ================================================================

interface PollsTableProps {
  polls: PollResponse[];
  onPollClick: (poll: PollResponse) => void;
}

function PollsTable({ polls, onPollClick }: PollsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titel</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Erstellt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {polls.map((poll) => (
          <TableRow
            key={poll.id}
            className="cursor-pointer"
            onClick={() => onPollClick(poll)}
          >
            <TableCell className="font-medium">{poll.title}</TableCell>
            <TableCell>
              <StatusBadge status={poll.status} />
            </TableCell>
            <TableCell>{formatDate(poll.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface CodesTableProps {
  codes: VotingCodeResponse[];
  onCopy: (code: string) => void;
}

function CodesTable({ codes, onCopy }: CodesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map((code) => (
          <TableRow key={code.id}>
            <TableCell className="font-mono">{code.code}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(code.code)}
              >
                Kopieren
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
