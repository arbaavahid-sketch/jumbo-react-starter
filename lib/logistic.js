// Shared parsing helpers for the LOGISTIC AA board.
//
// A sheet cell describes one deal and is written in one of two styles:
//   1) Slash-separated (recommended): "Center / Deal / Item"
//        "Russia Truck 16/8089/Chromatec" -> { center, dealNumber: "8089", item: "Chromatec" }
//        Leave the middle empty when there is no deal number: "Center//Item"
//   2) Legacy single slash with the number and item glued together:
//        "Dubai Truck 1/7866GOLVES" -> { center, dealNumber: "7866", item: "GOLVES" }
//
// Parsing lives here (and runs once on the server in pages/api/data.js) so every
// consumer receives the same clean { center, dealNumber, item } shape.

export function splitDeal(value, fallbackDealNumber = "") {
  const raw = String(value || "").trim();
  const fallback = String(fallbackDealNumber || "").trim();
  if (!raw) return { center: "", dealNumber: fallback, item: "" };

  const seg = raw.split("/").map((s) => s.trim());

  // Style 1: explicit parts separated by slashes (Center / Deal / Item...)
  if (seg.length >= 3) {
    return {
      center: seg[0],
      dealNumber: seg[1] || fallback,
      item: seg.slice(2).filter(Boolean).join(" / "),
    };
  }

  // Style 2: one slash -> peel the leading number off "DealNumberItem"
  if (seg.length === 2) {
    const center = seg[0];
    const rest = seg[1];
    const match = rest.match(/^(\d+(?:-\d+)?)\s*(.*)$/);
    if (match) {
      return { center, dealNumber: match[1] || fallback, item: match[2].trim() };
    }
    return { center, dealNumber: fallback, item: rest };
  }

  // No slash at all
  return { center: seg[0], dealNumber: fallback, item: "" };
}

// A value counts as present only if it is non-empty and not a placeholder dash.
export function hasMeaningful(value) {
  const s = String(value || "").trim();
  return Boolean(s) && s !== "-";
}
