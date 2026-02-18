import crypto from "crypto";

export function hashKey(s) {
  return crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 24);
}

export function dedupeRecords(records) {
  const seen = new Map();
  const out = [];
  for (const r of records) {
    const key = (r.url || r.id || "").toLowerCase();
    if (!key) {
      out.push(r);
      continue;
    }
    if (!seen.has(key)) {
      seen.set(key, r);
      out.push(r);
    }
  }
  return out;
}

export function pickDynamicColumns(records) {
  const freq = {};
  for (const r of records) {
    const attrs = r.attributes || {};
    Object.keys(attrs).forEach((k) => {
      if (
        [
          "username",
          "works_count",
          "cited_by_count",
          "primary_category",
        ].includes(k) ||
        typeof attrs[k] === "object"
      )
        return;
      freq[k] = (freq[k] || 0) + 1;
    });
  }
  const entries = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);
  return ["name", "headline", "location", "score", ...entries];
}
