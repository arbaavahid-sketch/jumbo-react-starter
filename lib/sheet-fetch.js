export const SHEET_ERROR_MESSAGE = "اطلاعات از Google Sheets دریافت نشد. لطفاً کمی بعد دوباره تلاش کنید.";

export async function fetchSheetText(url) {
  if (!url) throw new Error("Sheet is not configured");
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Sheet HTTP ${response.status}`);
  const text = await response.text();
  // A permission/login page can arrive with HTTP 200. It is not CSV data.
  if (response.headers.get("content-type")?.includes("text/html") || /^\s*<(?:!doctype|html)/i.test(text)) {
    throw new Error("Sheet returned HTML instead of CSV");
  }
  if (!text.trim()) throw new Error("Sheet response is empty");
  return text;
}

export function sheetUnavailable(res) {
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(503).json({ error: "SHEET_UNAVAILABLE", message: SHEET_ERROR_MESSAGE });
}
