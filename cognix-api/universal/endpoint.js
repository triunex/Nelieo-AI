import { parseIntent } from "./intent.js";
import { matchProviders } from "./registry.js";
import { dedupeRecords, pickDynamicColumns } from "./utils.js";
import { computeScore } from "./scoring.js";
import { onEnrichment, offEnrichment, enqueue } from "./enrichment.js";

// In-memory cache (simple)
const cache = new Map(); // key -> { ts, data }
const TTL = 5 * 60 * 1000;

function getCache(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > TTL) {
    cache.delete(key);
    return null;
  }
  return v.data;
}
function setCache(key, data) {
  cache.set(key, { ts: Date.now(), data });
}

export function registerUniversalSearch(app) {
  app.get("/api/universal-search/stream", async (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const send = (type, p) => {
      try {
        res.write(`event: ${type}\n`);
        res.write(`data: ${JSON.stringify(p)}\n\n`);
      } catch (e) {}
    };

    const enrichmentListener = ({ id, patch }) => {
      send("update", { id, patch });
    };
    onEnrichment(enrichmentListener);

    const rawQuery = (req.query.q || "").toString().trim();
    if (!rawQuery) {
      send("error", { error: "Missing q" });
      return res.end();
    }
    send("init", { q: rawQuery });

    // Intent
    const intent = await parseIntent(rawQuery).catch(() => ({
      entityType: "people",
      filters: {},
    }));
    send("intent", intent);

    const providers = matchProviders(intent.entityType);
    send("providers", {
      count: providers.length,
      names: providers.map((p) => p.name),
    });

    const cacheKey = intent.entityType + "|" + rawQuery.toLowerCase();
    const cached = getCache(cacheKey);
    if (cached) {
      send("cached", { total: cached.length });
      const columns = pickDynamicColumns(cached);
      send("columns", { columns });
      for (const r of cached) {
        send("record", r);
      }
      send("done", { total: cached.length, cached: true });
      return res.end();
    }

    const gathered = [];

    await Promise.allSettled(
      providers.map(async (prov) => {
        const recs = await prov
          .fetch({ query: rawQuery, limit: 30, filters: intent.filters })
          .catch(() => []);
        for (const r of recs) {
          r.score = computeScore(r);
          gathered.push(r);
          send("record", r);
          enqueue(r); // schedule enrichment (skills, etc.)
        }
        // Update columns incrementally
        const columns = pickDynamicColumns(gathered);
        send("columns", { columns });
      })
    );

    const deduped = dedupeRecords(gathered);
    setCache(cacheKey, deduped);
    send("done", { total: deduped.length, cached: false });
    res.end();
    offEnrichment(enrichmentListener);
  });
}
