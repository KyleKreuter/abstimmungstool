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
import { Plus, X } from "lucide-react";
import type { PollGroupResponse, PollResponse, PollType } from "@/lib/types";

const POLL_TYPE_LABELS: Record<PollType, string> = {
  SIMPLE: "Einfache Abstimmung (Ja/Nein/Enthaltung)",
  PERSON_ELECTION: "Personenwahl (1 aus N)",
  MULTI_VOTE: "Mehrfachauswahl (bis zu X aus N)",
};

interface PollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: PollGroupResponse[];
  defaultGroupId?: number;
  poll?: PollResponse | null;
  onSave: (data: {
    title: string;
    description: string;
    groupId: number;
    type: string;
    maxChoices: number | null;
    options: { label: string }[] | null;
  }) => Promise<void>;
}

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
  const [pollType, setPollType] = useState<PollType>("SIMPLE");
  const [optionLabels, setOptionLabels] = useState<string[]>(["", ""]);
  const [maxChoices, setMaxChoices] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = poll != null;

  useEffect(() => {
    if (open) {
      if (poll) {
        setTitle(poll.title);
        setDescription(poll.description);
        setGroupId(String(poll.groupId));
        setPollType(poll.type);
        if (poll.type !== "SIMPLE") {
          setOptionLabels(poll.options.map((o) => o.label));
        }
        setMaxChoices(poll.maxChoices ?? 1);
      } else {
        setTitle("");
        setDescription("");
        setGroupId(defaultGroupId ? String(defaultGroupId) : "");
        setPollType("SIMPLE");
        setOptionLabels(["", ""]);
        setMaxChoices(1);
      }
      setError(null);
      setSaving(false);
    }
  }, [open, poll, defaultGroupId]);

  function addOption() {
    setOptionLabels((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    if (optionLabels.length <= 2) return;
    setOptionLabels((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    setOptionLabels((prev) =>
      prev.map((v, i) => (i === index ? value : v))
    );
  }

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

    if (pollType !== "SIMPLE") {
      const filledOptions = optionLabels.filter((l) => l.trim());
      if (filledOptions.length < 2) {
        setError("Mindestens 2 Optionen sind erforderlich");
        return;
      }
    }

    if (pollType === "MULTI_VOTE") {
      const filledCount = optionLabels.filter((l) => l.trim()).length;
      if (maxChoices < 1 || maxChoices > filledCount) {
        setError(`Maximale Auswahl muss zwischen 1 und ${filledCount} liegen`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const options =
        pollType !== "SIMPLE"
          ? optionLabels
              .filter((l) => l.trim())
              .map((l) => ({ label: l.trim() }))
          : null;

      await onSave({
        title: trimmedTitle,
        description: description.trim(),
        groupId: Number(groupId),
        type: pollType,
        maxChoices: pollType === "MULTI_VOTE" ? maxChoices : null,
        options,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                rows={3}
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

            {!isEdit && (
              <div className="space-y-2">
                <Label>Abstimmungstyp</Label>
                <Select
                  value={pollType}
                  onValueChange={(v) => setPollType(v as PollType)}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(POLL_TYPE_LABELS) as PollType[]).map(
                      (type) => (
                        <SelectItem key={type} value={type}>
                          {POLL_TYPE_LABELS[type]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pollType !== "SIMPLE" && !isEdit && (
              <div className="space-y-3">
                <Label>
                  {pollType === "PERSON_ELECTION"
                    ? "Kandidaten"
                    : "Optionen"}
                </Label>
                <div className="space-y-2">
                  {optionLabels.map((label, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={label}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={
                          pollType === "PERSON_ELECTION"
                            ? `Kandidat ${index + 1}`
                            : `Option ${index + 1}`
                        }
                        disabled={saving}
                      />
                      {optionLabels.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(index)}
                          disabled={saving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={saving}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {pollType === "PERSON_ELECTION"
                    ? "Kandidat hinzufügen"
                    : "Option hinzufügen"}
                </Button>
              </div>
            )}

            {pollType === "MULTI_VOTE" && !isEdit && (
              <div className="space-y-2">
                <Label htmlFor="max-choices">
                  Maximale Auswahl
                </Label>
                <Input
                  id="max-choices"
                  type="number"
                  min={1}
                  max={optionLabels.filter((l) => l.trim()).length || 1}
                  value={maxChoices}
                  onChange={(e) => setMaxChoices(Number(e.target.value))}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Wie viele Optionen darf ein Teilnehmer maximal wählen?
                </p>
              </div>
            )}

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
