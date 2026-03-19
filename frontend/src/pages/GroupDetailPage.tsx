import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import GroupDialog from "@/components/GroupDialog";
import PollDialog from "@/components/PollDialog";
import GenerateCodesDialog from "@/components/GenerateCodesDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import TablePagination from "@/components/TablePagination";
import { useAsyncData } from "@/hooks/useAsyncData";
import { Badge } from "@/components/ui/badge";
import {
  fetchGroup,
  fetchAllGroups,
  fetchPolls,
  fetchCodes,
  updateGroup,
  deleteGroup,
  createPoll,
  deletePoll,
  generateCodes,
  toggleCodeActive,
} from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import type { PollResponse, VotingCodeResponse } from "@/lib/types";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const groupId = Number(id);

  // ── Pagination & search state ───────────────────────────────
  const [pollsPage, setPollsPage] = useState(0);
  const [codesPage, setCodesPage] = useState(0);
  const [codeSearch, setCodeSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(codeSearch);
      setCodesPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [codeSearch]);

  // ── Data fetching ───────────────────────────────────────────
  const {
    data: group,
    loading: groupLoading,
    error: groupError,
    refetch: refetchGroup,
    setData: setGroup,
  } = useAsyncData(() => fetchGroup(groupId), [groupId]);

  const {
    data: allGroupsData,
  } = useAsyncData(() => fetchAllGroups(), []);

  const {
    data: pollsData,
    loading: pollsLoading,
    refetch: refetchPolls,
  } = useAsyncData(
    () => fetchPolls(pollsPage, 20, groupId),
    [groupId, pollsPage]
  );

  const {
    data: codesData,
    loading: codesLoading,
    refetch: refetchCodes,
    setData: setCodesData,
  } = useAsyncData(
    () => fetchCodes(groupId, codesPage, 20, debouncedSearch || undefined),
    [groupId, codesPage, debouncedSearch]
  );

  const polls = pollsData?.content ?? [];
  const codes = codesData?.content ?? [];

  // ── Rename dialog ───────────────────────────────────────────
  const [renameOpen, setRenameOpen] = useState(false);

  const handleRename = useCallback(
    async (name: string) => {
      await updateGroup(groupId, name);
      refetchGroup();
      toast.success("Gruppe umbenannt");
    },
    [groupId, refetchGroup]
  );

  // ── Delete dialog ───────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    try {
      await deleteGroup(groupId);
      toast.success("Gruppe gelöscht");
      navigate("/admin");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Löschen"
      );
    }
    setDeleteOpen(false);
  }

  // ── Poll dialog ─────────────────────────────────────────────
  const [pollDialogOpen, setPollDialogOpen] = useState(false);

  const handleCreatePoll = useCallback(
    async (data: {
      title: string;
      description: string;
      groupId: number;
      type: string;
      maxChoices: number | null;
      options: { label: string }[] | null;
    }) => {
      await createPoll(data.groupId, {
        title: data.title,
        description: data.description,
        type: data.type,
        maxChoices: data.maxChoices,
        options: data.options,
      });
      refetchPolls();
      refetchGroup();
      toast.success("Abstimmung erstellt");
    },
    [refetchPolls, refetchGroup]
  );

  // ── Delete poll state ───────────────────────────────────────
  const [deletingPoll, setDeletingPoll] = useState<PollResponse | null>(null);

  async function handleDeletePoll() {
    if (!deletingPoll) return;
    try {
      await deletePoll(deletingPoll.id);
      refetchPolls();
      refetchGroup();
      toast.success("Abstimmung gelöscht");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Löschen"
      );
    }
    setDeletingPoll(null);
  }

  // ── Generate codes dialog ──────────────────────────────────
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

  // ── Toggle code active ─────────────────────────────────────
  async function handleToggleActive(codeId: number) {
    try {
      const updated = await toggleCodeActive(groupId, codeId);
      setCodesData((prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((c) =>
                c.id === codeId ? updated : c
              ),
            }
          : null
      );
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              activeCodeCount:
                prev.activeCodeCount + (updated.active ? 1 : -1),
            }
          : null
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Umschalten"
      );
    }
  }

  // ── Copy code to clipboard ─────────────────────────────────
  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Code kopiert");
    });
  }

  // ── Loading & Error ─────────────────────────────────────────
  if (groupLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="rounded-lg border p-8 text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Gruppe nicht gefunden</h1>
          <p className="text-muted-foreground">
            Die angeforderte Gruppe existiert nicht oder wurde gelöscht.
          </p>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            &larr; Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* ── Header ────────────────────────────────────────────── */}
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

      {/* ── Polls section ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Abstimmungen ({group.pollCount})
          </h2>
          <Button size="sm" onClick={() => setPollDialogOpen(true)}>
            Neue Abstimmung
          </Button>
        </div>

        {pollsLoading && !pollsData ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : polls.length > 0 ? (
          <>
            <PollsTable
              polls={polls}
              onPollClick={(poll) => navigate(`/admin/polls/${poll.id}`)}
              onDelete={setDeletingPoll}
            />
            {pollsData && (
              <TablePagination
                page={pollsData.page}
                totalPages={pollsData.totalPages}
                onPageChange={setPollsPage}
              />
            )}
          </>
        ) : (
          <p className="py-4 text-center text-muted-foreground">
            Keine Abstimmungen in dieser Gruppe.
          </p>
        )}
      </section>

      {/* ── Codes section ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Abstimmungscodes ({group.activeCodeCount} von {group.codeCount}{" "}
            aktiv)
          </h2>
          <Button size="sm" onClick={() => setCodesDialogOpen(true)}>
            Codes generieren
          </Button>
        </div>

        {/* Search input */}
        <div className="relative mb-4 max-w-sm">
          <Input
            placeholder="Code suchen..."
            value={codeSearch}
            onChange={(e) => setCodeSearch(e.target.value)}
          />
          {codeSearch && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setCodeSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {codesLoading && !codesData ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : codes.length > 0 ? (
          <>
            <CodesTable
              codes={codes}
              onCopy={copyCode}
              onToggleActive={handleToggleActive}
            />
            {codesData && (
              <TablePagination
                page={codesData.page}
                totalPages={codesData.totalPages}
                onPageChange={setCodesPage}
              />
            )}
          </>
        ) : (
          <p className="py-4 text-center text-muted-foreground">
            {debouncedSearch
              ? "Keine Codes gefunden."
              : "Keine Codes in dieser Gruppe."}
          </p>
        )}
      </section>

      {/* ── Dialogs ───────────────────────────────────────────── */}
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
        description={`Möchten Sie die Gruppe "${group.name}" wirklich löschen? Alle zugehörigen Abstimmungen, Stimmen und Codes werden ebenfalls gelöscht.`}
        confirmLabel="Löschen"
        onConfirm={handleDelete}
        destructive
      />

      <PollDialog
        open={pollDialogOpen}
        onOpenChange={setPollDialogOpen}
        groups={allGroupsData?.content ?? []}
        defaultGroupId={groupId}
        onSave={handleCreatePoll}
      />

      <GenerateCodesDialog
        open={codesDialogOpen}
        onOpenChange={setCodesDialogOpen}
        onGenerate={handleGenerateCodes}
      />

      <ConfirmDialog
        open={deletingPoll !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingPoll(null);
        }}
        title="Abstimmung löschen"
        description={`Möchten Sie die Abstimmung "${deletingPoll?.title}" wirklich löschen? Alle zugehörigen Stimmen werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
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

interface PollsTableProps {
  polls: PollResponse[];
  onPollClick: (poll: PollResponse) => void;
  onDelete: (poll: PollResponse) => void;
}

function PollsTable({ polls, onPollClick, onDelete }: PollsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titel</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Erstellt</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
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
            <TableCell className="text-right">
              {poll.status === "PUBLISHED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(poll);
                  }}
                >
                  Löschen
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface CodesTableProps {
  codes: VotingCodeResponse[];
  onCopy: (code: string) => void;
  onToggleActive: (codeId: number) => void;
}

function CodesTable({ codes, onCopy, onToggleActive }: CodesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map((code) => (
          <TableRow key={code.id}>
            <TableCell className="font-mono">{code.code}</TableCell>
            <TableCell>
              <Badge variant={code.active ? "default" : "secondary"}>
                {code.active ? "Aktiv" : "Inaktiv"}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleActive(code.id)}
              >
                {code.active ? "Deaktivieren" : "Aktivieren"}
              </Button>
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
