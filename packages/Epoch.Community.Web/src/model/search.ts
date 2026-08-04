/** Pure receipt search predicate used by the channel toolbar and unit tests. */
export function messageMatchesReceiptSearch(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return text.toLowerCase().includes(q);
}
