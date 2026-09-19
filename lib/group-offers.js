export const OFFER_NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Source timestamps, not browser first-seen dates, keep every display in sync.
export function offerAddedAt(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  // Date-only values refer to midnight in the source sheet's Tehran timezone.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00+03:30` : raw;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(iso)) {
    return null;
  }
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())
    return null;
  const timestamp = Date.parse(iso);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function isNewOffer(row, now) {
  const addedAt = offerAddedAt(row.added_at);
  if (!addedAt || !Number.isFinite(now)) return false;
  const age = now - Date.parse(addedAt);
  return age >= 0 && age < OFFER_NEW_WINDOW_MS;
}

export function nextOfferChange(rows, now) {
  let next = Infinity;
  for (const row of rows) {
    const value = offerAddedAt(row.added_at);
    if (!value) continue;
    const start = Date.parse(value);
    for (const boundary of [start, start + OFFER_NEW_WINDOW_MS]) {
      if (boundary > now) next = Math.min(next, boundary);
    }
  }
  return next;
}
