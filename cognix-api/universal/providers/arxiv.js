import axios from "axios";
import crypto from "crypto";
import { parseStringPromise } from "xml2js";

function normalizeEntry(e) {
  const id = e.id?.[0] || crypto.randomUUID();
  const title = (e.title?.[0] || "").replace(/\s+/g, " ").trim();
  const authors = (e.author || [])
    .map((a) => a.name?.[0])
    .filter(Boolean)
    .join(", ");
  return {
    id: `arxiv:${id}`,
    type: "people",
    name: authors || title.slice(0, 60),
    headline: title,
    location: null,
    url: id,
    image: null,
    source: "arxiv",
    score: 0.0,
    tags: [],
    summary: (e.summary?.[0] || "").slice(0, 500),
    attributes: { primary_category: e.category?.[0]?.$.term },
    media: {},
    metrics: {},
    updatedAt: new Date().toISOString(),
  };
}

export function arxivAuthors() {
  return {
    name: "arxivAuthors",
    supports: ["people"],
    async fetch({ query, limit = 15 }) {
      const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
        query
      )}&start=0&max_results=${Math.min(limit, 30)}`;
      try {
        const resp = await axios.get(url, { timeout: 10000 });
        const xml = resp.data;
        const parsed = await parseStringPromise(xml);
        const entries = parsed?.feed?.entry || [];
        return entries.map(normalizeEntry);
      } catch (e) {
        return [];
      }
    },
  };
}
