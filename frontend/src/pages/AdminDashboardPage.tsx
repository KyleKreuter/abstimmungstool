import { useState, useMemo, useCallback } from "react";
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
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  fetchGroups,
  fetchPolls,
  createGroup,
  updateGroup,
  deleteGroup,
  createPoll,
} from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import type { PollGroupResponse, PollResponse } from "@/lib/types";

/**
 * Admin Dashboard page.
 *
 * Displays a tabbed view of all polls (filterable by group) and
 * a groups management section. Provides dialogs for creating new
 * groups and polls.
 */
export default function AdminDashboardPage() {
  const navigate = useNavigate();

  // ── Data fetching ──────────────────────────────────────────
  const {
    data: groups,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useAsyncData(fetchGroups);

  const {
    data: polls,
    loading: pollsLoading,
    error: pollsError,
    refetch: refetchPolls,
  } = useAsyncData(fetchPolls);

  // ── Tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("all");

  /** Polls filtered by the selected tab */
  const filteredPolls = useMemo(() => {
    if (!polls) return [];
    if (activeTab === "all") return polls;
    const groupId = Number(activeTab);
    return polls.filter((p) => p.groupId === groupId);
  }, [polls, activeTab]);

  // ── Group dialog state ─────────────────────────────────────
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PollGroupResponse | null>(
    null
  );

  const handleCreateGroup = useCallback(
    async (name: string) => {
      const existing = groups?.find(
        (g) => g.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        throw new Error("Eine Gruppe mit diesem Namen existiert bereits.");
      }
      await createGroup(name);
      refetchGroups();
      toast.success("Gruppe erstellt");
    },
    [refetchGroups, groups]
  );

  const handleUpdateGroup = useCallback(
    async (name: string) => {
      if (!editingGroup) return;
      const existing = groups?.find(
        (g) => g.name.toLowerCase() === name.toLowerCase() && g.id !== editingGroup.id
      );
      if (existing) {
        throw new Error("Eine Gruppe mit diesem Namen existiert bereits.");
      }
      await updateGroup(editingGroup.id, name);
      refetchGroups();
      refetchPolls();
      toast.success("Gruppe umbenannt");
    },
    [editingGroup, refetchGroups, refetchPolls, groups]
  );

  function openEditGroup(group: PollGroupResponse) {
    setEditingGroup(group);
  }

  // ── Delete group state ─────────────────────────────────────
  const [deletingGroup, setDeletingGroup] =
    useState<PollGroupResponse | null>(null);

  async function handleDeleteGroup() {
    if (!deletingGroup) return;
    try {
      await deleteGroup(deletingGroup.id);
      refetchGroups();
      refetchPolls();
      toast.success("Gruppe gelöscht");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Löschen"
      );
    }
    setDeletingGroup(null);
  }

  // ── Poll dialog state ──────────────────────────────────────
  const [pollDialogOpen, setPollDialogOpen] = useState(false);

  const handleCreatePoll = useCallback(
    async (data: { title: string; description: string; groupId: number }) => {
      await createPoll(data.groupId, {
        title: data.title,
        description: data.description,
      });
      refetchPolls();
      refetchGroups();
      toast.success("Abstimmung erstellt");
    },
    [refetchPolls, refetchGroups]
  );

  // ── Loading & Error states ─────────────────────────────────
  const loading = groupsLoading || pollsLoading;
  const error = groupsError || pollsError;

  if (loading) {
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
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGroupDialogOpen(true)}>
            Neue Gruppe
          </Button>
          <Button onClick={() => setPollDialogOpen(true)}>
            Neue Abstimmung
          </Button>
        </div>
      </div>

      {/* ── Polls section with group tabs ────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Abstimmungen</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto justify-start">
            <TabsTrigger value="all">Alle</TabsTrigger>
            {groups?.map((group) => (
              <TabsTrigger key={group.id} value={String(group.id)}>
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Single content area shared by all tabs */}
          <TabsContent value={activeTab}>
            <PollsTable
              polls={filteredPolls}
              onPollClick={(poll) => navigate(`/admin/polls/${poll.id}`)}
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* ── Groups section ───────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Gruppen</h2>
        <GroupsTable
          groups={groups ?? []}
          onGroupClick={(group) => navigate(`/admin/groups/${group.id}`)}
          onEdit={openEditGroup}
          onDelete={setDeletingGroup}
        />
      </section>

      {/* ── Dialogs ──────────────────────────────────────────── */}
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
        groups={groups ?? []}
        onSave={handleCreatePoll}
      />

      <ConfirmDialog
        open={deletingGroup !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingGroup(null);
        }}
        title="Gruppe löschen"
        description={`Möchten Sie die Gruppe "${deletingGroup?.name}" wirklich löschen? Dies ist nur möglich, wenn die Gruppe leer ist.`}
        confirmLabel="Löschen"
        onConfirm={handleDeleteGroup}
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
}

/** Table displaying a list of polls */
function PollsTable({ polls, onPollClick }: PollsTableProps) {
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

/** Table displaying a list of groups with action buttons */
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
