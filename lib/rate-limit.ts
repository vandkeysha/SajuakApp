// Pembatas sederhana (in-memory). Untuk produksi multi-server, pakai Redis/Upstash.
const hits = new Map<string, { n: number; reset: number }>();
export function limited(key: string, max = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return false; }
  h.n++;
  return h.n > max;
}
