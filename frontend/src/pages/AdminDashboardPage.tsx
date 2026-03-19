import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import ConfirmDialog from "@/components/ConfirmDialog";
import TablePagination from "@/components/TablePagination";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  fetchGroups,
  fetchAllGroups,
  fetchPolls,
  createGroup,
  updateGroup,
  deleteGroup,
  createPoll,
  deletePoll,
} from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import type { PollGroupResponse, PollResponse } from "@/lib/types";

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  // ── Pagination state ────────────────────────────────────────
  const [groupsPage, setGroupsPage] = useState(0);
  const [pollsPage, setPollsPage] = useState(0);

  // ── Tab state ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("all");

  const groupIdFilter =
    activeTab === "all" ? undefined : Number(activeTab);

  // ── Data fetching ───────────────────────────────────────────
  const {
    data: groupsData,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useAsyncData(() => fetchGroups(groupsPage), [groupsPage]);

  const {
    data: allGroupsData,
    refetch: refetchAllGroups,
  } = useAsyncData(() => fetchAllGroups(), []);

  const {
    data: pollsData,
    loading: pollsLoading,
    error: pollsError,
    refetch: refetchPolls,
  } = useAsyncData(
    () => fetchPolls(pollsPage, 20, groupIdFilter),
    [pollsPage, activeTab]
  );

  const groups = groupsData?.content ?? [];
  const allGroups = allGroupsData?.content ?? [];
  const polls = pollsData?.content ?? [];

  // ── Tab change handler ──────────────────────────────────────
  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setPollsPage(0);
  }

  // ── Group dialog state ──────────────────────────────────────
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PollGroupResponse | null>(
    null
  );

  const handleCreateGroup = useCallback(
    async (name: string) => {
      const existing = allGroups.find(
        (g) => g.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        throw new Error("Eine Gruppe mit diesem Namen existiert bereits.");
      }
      await createGroup(name);
      refetchGroups();
      refetchAllGroups();
      toast.success("Gruppe erstellt");
    },
    [refetchGroups, refetchAllGroups, allGroups]
  );

  const handleUpdateGroup = useCallback(
    async (name: string) => {
      if (!editingGroup) return;
      const existing = allGroups.find(
        (g) =>
          g.name.toLowerCase() === name.toLowerCase() &&
          g.id !== editingGroup.id
      );
      if (existing) {
        throw new Error("Eine Gruppe mit diesem Namen existiert bereits.");
      }
      await updateGroup(editingGroup.id, name);
      refetchGroups();
      refetchAllGroups();
      refetchPolls();
      toast.success("Gruppe umbenannt");
    },
    [editingGroup, refetchGroups, refetchAllGroups, refetchPolls, allGroups]
  );

  function openEditGroup(group: PollGroupResponse) {
    setEditingGroup(group);
  }

  // ── Delete group state ──────────────────────────────────────
  const [deletingGroup, setDeletingGroup] =
    useState<PollGroupResponse | null>(null);

  async function handleDeleteGroup() {
    if (!deletingGroup) return;
    try {
      await deleteGroup(deletingGroup.id);
      refetchGroups();
      refetchAllGroups();
      refetchPolls();
      toast.success("Gruppe gelöscht");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Löschen"
      );
    }
    setDeletingGroup(null);
  }

  // ── Delete poll state ───────────────────────────────────────
  const [deletingPoll, setDeletingPoll] = useState<PollResponse | null>(null);

  async function handleDeletePoll() {
    if (!deletingPoll) return;
    try {
      await deletePoll(deletingPoll.id);
      refetchPolls();
      refetchGroups();
      refetchAllGroups();
      toast.success("Abstimmung gelöscht");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Löschen"
      );
    }
    setDeletingPoll(null);
  }

  // ── Poll dialog state ───────────────────────────────────────
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
      refetchGroups();
      refetchAllGroups();
      toast.success("Abstimmung erstellt");
    },
    [refetchPolls, refetchGroups, refetchAllGroups]
  );

  // ── Loading & Error states ──────────────────────────────────
  const loading = groupsLoading || pollsLoading;
  const error = groupsError || pollsError;

  if (loading && !groupsData && !pollsData) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Fehler: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGroupDialogOpen(true)}>
            Neue Gruppe
          </Button>
          <Button onClick={() => setPollDialogOpen(true)}>
            Neue Abstimmung
          </Button>
        </div>
      </div>

      {/* ── Polls section with group tabs ─────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Abstimmungen</h2>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap h-auto justify-start">
            <TabsTrigger value="all">Alle</TabsTrigger>
            {allGroups.map((group) => (
              <TabsTrigger key={group.id} value={String(group.id)}>
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
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
          </TabsContent>
        </Tabs>
      </section>

      {/* ── Groups section ────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Gruppen</h2>
        <GroupsTable
          groups={groups}
          onGroupClick={(group) => navigate(`/admin/groups/${group.id}`)}
          onEdit={openEditGroup}
          onDelete={setDeletingGroup}
        />
        {groupsData && (
          <TablePagination
            page={groupsData.page}
            totalPages={groupsData.totalPages}
            onPageChange={setGroupsPage}
          />
        )}
      </section>

      {/* ── Dialogs ───────────────────────────────────────────── */}
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onSave={handleCreateGroup}
      />

      <GroupDialog
        open={editingGroup !== null}
        onOpenChange={(open) => {
          if (!open) setEditingGroup(null);
        }}
        onSave={handleUpdateGroup}
        initialName={editingGroup?.name ?? ""}
      />

      <PollDialog
        open={pollDialogOpen}
        onOpenChange={setPollDialogOpen}
        groups={allGroups}
        onSave={handleCreatePoll}
      />

      <ConfirmDialog
        open={deletingGroup !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingGroup(null);
        }}
        title="Gruppe löschen"
        description={`Möchten Sie die Gruppe "${deletingGroup?.name}" wirklich löschen? Alle zugehörigen Abstimmungen, Stimmen und Codes werden ebenfalls gelöscht.`}
        confirmLabel="Löschen"
        onConfirm={handleDeleteGroup}
        destructive
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
  if (polls.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Keine Abstimmungen vorhanden.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titel</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Gruppe</TableHead>
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
            <TableCell>{poll.groupName}</TableCell>
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

interface GroupsTableProps {
  groups: PollGroupResponse[];
  onGroupClick: (group: PollGroupResponse) => void;
  onEdit: (group: PollGroupResponse) => void;
  onDelete: (group: PollGroupResponse) => void;
}

function GroupsTable({
  groups,
  onGroupClick,
  onEdit,
  onDelete,
}: GroupsTableProps) {
  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Keine Gruppen vorhanden.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Abstimmungen</TableHead>
          <TableHead>Codes</TableHead>
          <TableHead>Erstellt</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <TableRow key={group.id}>
            <TableCell
              className="cursor-pointer font-medium"
              onClick={() => onGroupClick(group)}
            >
              {group.name}
            </TableCell>
            <TableCell>{group.pollCount}</TableCell>
            <TableCell>{group.codeCount}</TableCell>
            <TableCell>{formatDate(group.createdAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(group);
                  }}
                >
                  Umbenennen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(group);
                  }}
                >
                  Löschen
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
