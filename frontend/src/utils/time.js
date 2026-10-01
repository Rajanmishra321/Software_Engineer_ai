const UNITS = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
];

const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** "2 hours ago", "yesterday"... Returns "" when there is no date. */
export const formatRelativeTime = (date) => {
  if (!date) return "";

  const elapsed = new Date(date).getTime() - Date.now();
  if (Number.isNaN(elapsed)) return "";

  for (const { unit, ms } of UNITS) {
    if (Math.abs(elapsed) >= ms) return formatter.format(Math.round(elapsed / ms), unit);
  }
  return "just now";
};
