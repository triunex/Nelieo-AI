import axios from "axios";

function haversineKm(lat1, lon1, lat2, lon2) {
  function toRad(d) {
    return (d * Math.PI) / 180;
  }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocodeLocation(text) {
  if (!text) return null;
  try {
    const resp = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: text, format: "json", limit: 1 },
      headers: { "User-Agent": "NelieoAI-Geocoder" },
      timeout: 5000,
    });
    const first = resp.data?.[0];
    if (!first) return null;
    return {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      display: first.display_name,
    };
  } catch {
    return null;
  }
}

function normalizeUser(u, detail, geo, distanceKm) {
  return {
    id: `gh:${u.id}`,
    type: "people",
    name: detail?.name || u.login,
    headline: detail?.bio || "GitHub Developer",
    location: geo?.display || detail?.location || null,
    url: u.html_url,
    image: detail?.avatar_url || u.avatar_url,
    source: "github",
    score: 0.0,
    tags: [],
    summary: (detail?.bio || "").slice(0, 240),
    attributes: {
      username: u.login,
      company: detail?.company || null,
      email: detail?.email || null,
      distance_km: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
      public_repos: detail?.public_repos ?? null,
      followers: detail?.followers ?? null,
      following: detail?.following ?? null,
    },
    media: { avatar: detail?.avatar_url || u.avatar_url, github: u.html_url },
    metrics: {
      stars: null,
      followers: detail?.followers || 0,
      repos: detail?.public_repos || 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function githubEngineers() {
  return {
    name: "githubEngineers",
    supports: ["people"],
    async fetch({ query, limit = 30, location }) {
      const q = `${query}`;
      const perPage = Math.min(limit, 50);
      const url = `https://api.github.com/search/users?q=${encodeURIComponent(
        q
      )}&per_page=${perPage}`;
      try {
        const searchResp = await axios.get(url, {
          headers: { "User-Agent": "NelieoAI" },
          timeout: 8000,
        });
        const users = searchResp.data?.items || [];
        const topForDetail = users.slice(0, 10);
        const detailed = await Promise.all(
          topForDetail.map(async (u) => {
            try {
              const detailResp = await axios.get(
                `https://api.github.com/users/${u.login}`,
                { headers: { "User-Agent": "NelieoAI" }, timeout: 8000 }
              );
              let geo = null;
              let distanceKm = null;
              if (detailResp.data?.location) {
                geo = await geocodeLocation(detailResp.data.location);
                if (location?.lat != null && location?.lon != null && geo) {
                  distanceKm = haversineKm(
                    location.lat,
                    location.lon,
                    geo.lat,
                    geo.lon
                  );
                }
              }
              return normalizeUser(u, detailResp.data, geo, distanceKm);
            } catch {
              return normalizeUser(u, null, null, null);
            }
          })
        );
        // For remaining users (if any) just shallow normalize
        const rest = users
          .slice(10)
          .map((u) => normalizeUser(u, null, null, null));
        return [...detailed, ...rest];
      } catch (e) {
        return [];
      }
    },
  };
}
