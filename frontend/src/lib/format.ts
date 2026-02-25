/**
 * Format an ISO date string to a localized German date/time string.
 *
 * @param isoString - ISO 8601 date string from the API
 * @returns Formatted date string like "25.02.2026, 14:30"
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format an ISO date string to a short date only.
 *
 * @param isoString - ISO 8601 date string from the API
 * @returns Formatted date string like "25.02.2026"
 */
export function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
