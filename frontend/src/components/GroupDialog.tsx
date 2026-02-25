import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GroupDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Callback when save is confirmed. Receives the group name. */
  onSave: (name: string) => Promise<void>;
  /** If provided, the dialog is in edit mode with this initial name */
  initialName?: string;
  /** Title override */
  title?: string;
}

/**
 * Dialog for creating or renaming a poll group.
 * Shows a single input field for the group name.
 */
export default function GroupDialog({
  open,
  onOpenChange,
  onSave,
  initialName = "",
  title,
}: GroupDialogProps) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = initialName.length > 0;
  const dialogTitle = title ?? (isEdit ? "Gruppe umbenennen" : "Neue Gruppe");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
      setSaving(false);
    }
  }, [open, initialName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name darf nicht leer sein");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(trimmedName);
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
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Geben Sie den neuen Namen für die Gruppe ein."
                : "Geben Sie einen Namen für die neue Gruppe ein."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Gruppenname"
              autoFocus
              disabled={saving}
            />
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
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
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
