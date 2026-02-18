import { githubEngineers } from "./providers/github.js";
import { openAlexResearchers } from "./providers/openalex.js";
import { arxivAuthors } from "./providers/arxiv.js";

const _providers = [githubEngineers(), openAlexResearchers(), arxivAuthors()];

export function allProviders() {
  return _providers;
}
export function matchProviders(entityType) {
  return _providers.filter((p) => p.supports.includes(entityType));
}
