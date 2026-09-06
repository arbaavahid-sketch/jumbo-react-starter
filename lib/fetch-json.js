export async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  return response.json();
}
