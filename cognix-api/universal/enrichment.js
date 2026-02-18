// Enrichment queue with EventEmitter
// Adds: basic skill extraction from bio/company; future: repo scrape & LLM
import { EventEmitter } from "events";

const emitter = new EventEmitter();
const queue = [];
let running = false;

export function onEnrichment(listener) {
  emitter.on("enriched", listener);
}
export function offEnrichment(listener) {
  emitter.off("enriched", listener);
}

export function enqueue(record) {
  queue.push(record);
  tick();
}

function extractSkills(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const vocab = [
    "python",
    "javascript",
    "typescript",
    "react",
    "node",
    "go",
    "rust",
    "java",
    "kotlin",
    "ml",
    "ai",
    "llm",
    "nlp",
    "cv",
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure",
    "postgres",
    "mysql",
    "graphql",
  ];
  const found = new Set();
  vocab.forEach((v) => {
    if (lower.includes(v)) found.add(v);
  });
  return Array.from(found);
}

async function enrich(rec) {
  // Heuristic skill extraction
  const bio = rec.headline || rec.summary || "";
  const skills = extractSkills(bio + " " + (rec.attributes?.company || ""));
  if (skills.length) {
    rec.attributes = { ...rec.attributes, skills };
  }
  // TODO: fetch top repos & languages, LLM summarization (future)
  emitter.emit("enriched", {
    id: rec.id,
    patch: { attributes: rec.attributes },
  });
}

async function tick() {
  if (running) return;
  running = true;
  while (queue.length) {
    const rec = queue.shift();
    try {
      await enrich(rec);
      // tiny spacing to avoid event burst starvation
      await new Promise((r) => setTimeout(r, 5));
    } catch (e) {
      /* swallow */
    }
  }
  running = false;
}

export function queueSize() {
  return queue.length;
}
export { emitter as enrichmentEmitter };
