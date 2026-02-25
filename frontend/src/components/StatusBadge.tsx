import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { PollStatus } from "@/lib/types";

/** Maps poll status to badge variant and label */
const STATUS_CONFIG: Record<
  PollStatus,
  { variant: BadgeProps["variant"]; label: string }
> = {
  DRAFT: { variant: "outline", label: "Entwurf" },
  OPEN: { variant: "default", label: "Offen" },
  CLOSED: { variant: "secondary", label: "Geschlossen" },
  PUBLISHED: { variant: "outline", label: "Veröffentlicht" },
};

interface StatusBadgeProps {
  status: PollStatus;
  className?: string;
}

/**
 * Renders a poll status as a styled badge.
 * Uses different variants for each status:
 * - DRAFT: outline
 * - OPEN: default (primary)
 * - CLOSED: secondary
 * - PUBLISHED: outline
 */
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
