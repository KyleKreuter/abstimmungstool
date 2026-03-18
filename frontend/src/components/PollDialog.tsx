import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PollGroupResponse, PollResponse } from "@/lib/types";

interface PollDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Available groups to select from */
  groups: PollGroupResponse[];
  /** Pre-selected group ID (e.g. when creating from a group page) */
  defaultGroupId?: number;
  /** If provided, the dialog is in edit mode with this poll data */
  poll?: PollResponse | null;
  /** Callback when save is confirmed */
  onSave: (data: {
    title: string;
    description: string;
    groupId: number;
  }) => Promise<void>;
}

/**
 * Dialog for creating or editing a poll.
 * Includes fields for title, description, and group selection.
 */
export default function PollDialog({
  open,
  onOpenChange,
  groups,
  defaultGroupId,
  poll,
  onSave,
}: PollDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = poll != null;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (poll) {
        setTitle(poll.title);
        setDescription(poll.description);
        setGroupId(String(poll.groupId));
      } else {
        setTitle("");
        setDescription("");
        setGroupId(defaultGroupId ? String(defaultGroupId) : "");
      }
      setError(null);
      setSaving(false);
    }
  }, [open, poll, defaultGroupId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Titel darf nicht leer sein");
      return;
    }

    if (!groupId) {
      setError("Bitte wählen Sie eine Gruppe aus");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: trimmedTitle,
        description: description.trim(),
        groupId: Number(groupId),
      });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Abstimmung bearbeiten" : "Neue Abstimmung"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Bearbeiten Sie die Abstimmungsdetails."
                : "Erstellen Sie eine neue Abstimmung."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="poll-title">Titel</Label>
              <Input
                id="poll-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel der Abstimmung"
                autoFocus
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poll-description">Beschreibung</Label>
              <Textarea
                id="poll-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibung der Abstimmung (optional)"
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label>Gruppe</Label>
              <Select
                value={groupId}
                onValueChange={setGroupId}
                disabled={saving || isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Gruppe auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Die Gruppe kann nach der Erstellung nicht geändert werden.
                </p>
              )}
              {groupId && (() => {
                const selectedGroup = groups.find((g) => String(g.id) === groupId);
                return selectedGroup ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedGroup.activeCodeCount} von {selectedGroup.codeCount} Codes aktiv
                  </p>
                ) : null;
              })()}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim() || !groupId}
            >
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
