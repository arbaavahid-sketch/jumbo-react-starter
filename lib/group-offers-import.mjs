const clean = (value) => String(value ?? "").trim();
const nameKey = (value) => clean(value).toLowerCase().replace(/\s+/g, " ");

function byId(rows) {
  const result = new Map();
  for (const row of rows) {
    const id = clean(row["Record ID"]);
    if (!id || result.has(id)) throw new Error("Missing or duplicate Record ID in HubSpot export");
    result.set(id, row);
  }
  return result;
}

function closeDate(value) {
  // Excel and Google Sheets share this date serial representation.
  return typeof value === "number" ? value : clean(value);
}

// Called at import time. Re-reading or re-importing a row never restarts its week.
// previousDeals is only needed to migrate legacy source rows without Record ID.
export function prepareOffersUpdate({
  currentDeals,
  existingRows,
  previousDeals = [],
  importedAt,
}) {
  if (
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(importedAt) ||
    !Number.isFinite(Date.parse(importedAt))
  ) {
    throw new Error("An explicit import timestamp with timezone is required");
  }
  const timestamp = new Date(importedAt).toISOString();
  const current = byId(currentDeals);
  const previous = byId(previousDeals);
  const legacyNames = new Map();
  for (const [id, row] of previous) {
    const key = nameKey(row["Deal Name"]);
    legacyNames.set(key, legacyNames.has(key) ? null : id);
  }
  const existing = new Map();
  const ownerGroups = new Map();
  for (const row of existingRows) {
    if (!clean(row["Deal Name"])) continue;
    const id = clean(row["Record ID"]) || legacyNames.get(nameKey(row["Deal Name"]));
    if (!id || existing.has(id))
      throw new Error(`Cannot uniquely match existing offer: ${row["Deal Name"]}`);
    existing.set(id, row);
    const owner = nameKey(row["Deal owner"]);
    const group = clean(row.Group);
    if (!/^Group [ABC]$/.test(group) || !owner)
      throw new Error("Missing or invalid existing owner/group mapping");
    if (ownerGroups.has(owner) && ownerGroups.get(owner) !== group)
      throw new Error(`Conflicting group for ${owner}`);
    ownerGroups.set(owner, group);
  }
  const addedIds = [];
  const excludedOwners = {};
  const offers = [];
  for (const [id, row] of current) {
    if (!/^v?\s*offer\s+sent$/i.test(clean(row["Deal Stage"]))) continue;
    const group = ownerGroups.get(nameKey(row["Deal owner"]));
    if (!group) {
      const owner = clean(row["Deal owner"]) || "(unassigned)";
      excludedOwners[owner] = (excludedOwners[owner] || 0) + 1;
      continue;
    }
    const old = existing.get(id);
    const addedAt = old ? clean(old["Added At"]) : timestamp;
    if (!old) addedIds.push(id);
    const amount = row.Amount;
    if (amount != null && amount !== "" && !Number.isFinite(Number(amount)))
      throw new Error(`Invalid amount for ${id}`);
    offers.push({
      "Deal Name": clean(row["Deal Name"]),
      "Close Date": closeDate(row["Close Date"]),
      "Deal owner": clean(row["Deal owner"]),
      Group: group,
      Amount: amount == null || amount === "" ? "" : Number(amount),
      "Record ID": id,
      "Added At": addedAt,
    });
  }
  const counts = Object.fromEntries(
    ["A", "B", "C"].map((g) => [g, offers.filter((r) => r.Group === `Group ${g}`).length]),
  );
  return { offers, addedIds, excludedOwners, counts, importedAt: timestamp };
}
