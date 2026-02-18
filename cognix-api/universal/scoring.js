// Simple scoring placeholder
export function computeScore(
  record,
  { queryEmbedding = null, embedFn = null } = {}
) {
  // Baseline completeness
  const coreFields = ["name", "headline", "url"];
  let have = 0;
  coreFields.forEach((f) => {
    if (record[f]) have++;
  });
  const completeness = have / coreFields.length; // 0..1

  // Authority: followers/citations/stars heuristic
  let authority = 0.2;
  const followers = record.metrics?.followers || 0;
  const citations = record.metrics?.citations || 0;
  const stars = record.metrics?.stars || 0;
  // Log scaling so that 10 -> ~0.3, 100 -> ~0.5, 1k -> ~0.7, 10k -> ~0.9
  const followerFactor = followers
    ? Math.min(0.9, Math.log10(1 + followers) / 4 + 0.2)
    : 0;
  const citationFactor = citations
    ? Math.min(0.9, Math.log10(1 + citations) / 4 + 0.2)
    : 0;
  const starFactor = stars ? Math.min(0.9, Math.log10(1 + stars) / 4 + 0.2) : 0;
  authority = Math.max(followerFactor, citationFactor, starFactor, authority);

  let score = 0.5 * completeness + 0.5 * authority; // balanced

  // Proximity bonus (distance_km smaller is better)
  const dist = record.attributes?.distance_km;
  if (dist != null) {
    const proximityRaw = 1 / (1 + dist / 25); // 0km=1, 25km=0.5, 100km=0.2
    const proximity = Math.min(1, proximityRaw);
    score = score * 0.8 + proximity * 0.2; // 20% weight
  }

  return Number(score.toFixed(4));
}
