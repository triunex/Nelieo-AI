import crypto from "crypto";
import axios from "axios";

// Heuristic fallback classifier
function heuristic(raw) {
  const q = (raw || "").toLowerCase();
  const peopleSignals =
    /(engineer|developer|researcher|scientist|people|founder|investor|ml|ai)/;
  const investorSignals = /(investor|vc|venture|angel|fund)/;
  const startupSignals = /(startup|founder|saas|company|accelerator|incubator)/;
  const flightSignals = /(flight|airline|airport)/;
  const trainSignals = /(train|rail|railway)/;
  const placeSignals = /(cowork|hub|space|meetup|restaurant|cafe|innovation)/;
  const datasetSignals = /(dataset|data set|corpus|benchmark)/;
  const eventSignals = /(conference|event|summit|hackathon|workshop)/;

  let entityType = "people";
  if (investorSignals.test(q)) entityType = "investors";
  else if (startupSignals.test(q)) entityType = "startups";
  else if (flightSignals.test(q)) entityType = "flights";
  else if (trainSignals.test(q)) entityType = "trains";
  else if (placeSignals.test(q)) entityType = "places";
  else if (datasetSignals.test(q)) entityType = "datasets";
  else if (eventSignals.test(q)) entityType = "events";

  const skills = Array.from(
    new Set(
      (
        q.match(
          /python|java|golang|rust|react|node|llm|nlp|cv|pytorch|tensorflow/gi
        ) || []
      ).map((s) => s.toLowerCase())
    )
  );

  return {
    entityType,
    filters: {
      skills,
      location: "",
      radius_km: null,
      fundingStage: "",
      dateRange: "",
    },
    raw,
  };
}

export async function parseIntent(raw, { useLLM = true } = {}) {
  const base = heuristic(raw);
  if (!useLLM || !process.env.GEMINI_API_KEY) return base;
  try {
    const prompt = `Classify the user query into a structured JSON.\nQuery: "${raw}"\nReturn ONLY JSON with keys: entityType (one of people|investors|startups|flights|trains|places|datasets|events), filters:{skills:[], location:"", radius_km:null, fundingStage:"", dateRange:""}. Keep arrays short. If unsure fall back to \"people\".`;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const resp = await axios.post(
      url,
      { contents: [{ role: "user", parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" }, timeout: 8000 }
    );
    const jsonText =
      resp?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(jsonText.slice(start, end + 1));
      return { ...base, ...parsed };
    }
  } catch (e) {
    // ignore LLM/network errors and fallback to heuristic
  }
  return base;
}
