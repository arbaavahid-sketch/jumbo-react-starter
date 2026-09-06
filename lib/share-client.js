// Scope both the SWR cache key and the request URL to the current public link.
export function shareRequestKey(key, slug) {
  if (!slug || typeof key !== "string" || !key.startsWith("/api/")) return key;
  const [pathname, query = ""] = key.split("?");
  const params = new URLSearchParams(query);
  params.set("share", slug);
  return `${pathname}?${params}`;
}
export function shareMiddleware(slug) {
  return (useSWRNext) => (key, fetcher, config) => useSWRNext(shareRequestKey(key, slug), fetcher, config);
}
