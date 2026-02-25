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

interface GenerateCodesDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Callback when generation is confirmed. Receives the count. */
  onGenerate: (count: number) => Promise<void>;
}

/**
 * Dialog for generating voting codes.
 * Shows a numeric input for the number of codes to generate.
 */
export default function GenerateCodesDialog({
  open,
  onOpenChange,
  onGenerate,
}: GenerateCodesDialogProps) {
  const [count, setCount] = useState("10");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCount("10");
      setError(null);
      setGenerating(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const numCount = parseInt(count, 10);
    if (isNaN(numCount) || numCount < 1) {
      setError("Bitte geben Sie eine gültige Anzahl ein (mindestens 1)");
      return;
    }

    if (numCount > 1000) {
      setError("Maximal 1000 Codes können gleichzeitig generiert werden");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      await onGenerate(numCount);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Codes generieren</DialogTitle>
            <DialogDescription>
              Geben Sie die Anzahl der zu generierenden Abstimmungscodes ein.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="code-count">Anzahl</Label>
            <Input
              id="code-count"
              type="number"
              min="1"
              max="1000"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              autoFocus
              disabled={generating}
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
              disabled={generating}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={generating}>
              {generating ? "Generiere..." : "Generieren"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
