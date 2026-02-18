import axios from "axios";

function normalizeAuthor(a) {
  return {
    id: `openalex:${a.id}`,
    type: "people",
    name: a.display_name,
    headline: "Researcher",
    location: a.last_known_institution?.country_code || null,
    url: a.id,
    image: null,
    source: "openalex",
    score: 0.0,
    tags: [],
    summary: "",
    attributes: {
      works_count: a.works_count,
      cited_by_count: a.cited_by_count,
    },
    media: {},
    metrics: { citations: a.cited_by_count || 0, works: a.works_count || 0 },
    updatedAt: new Date().toISOString(),
  };
}

export function openAlexResearchers() {
  return {
    name: "openAlexResearchers",
    supports: ["people"],
    async fetch({ query, limit = 25 }) {
      const search = query.replace(/\s+/g, "+");
      const url = `https://api.openalex.org/authors?search=${encodeURIComponent(
        search
      )}&per-page=${Math.min(limit, 50)}`;
      try {
        const resp = await axios.get(url, { timeout: 9000 });
        const authors = resp.data?.results || [];
        return authors.map(normalizeAuthor);
      } catch (e) {
        return [];
      }
    },
  };
}
