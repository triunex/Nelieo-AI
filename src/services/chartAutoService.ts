export async function autoChartPipeline(userQuery: string) {
  // 1) parse intent
  const intentRes = await fetch("/api/parse-chart-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: userQuery }),
  }).then((r) => r.json());

  // 2) get structured data
  const extractRes = await fetch("/api/extract-chart-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: intentRes.topic,
      chart_type: intentRes.chart_type,
    }),
  }).then((r) => r.json());

  // 3) Best-effort: if no labels/values, return error
  if (!extractRes.labels?.length || !extractRes.values?.length) {
    return {
      error: "Could not auto-extract numeric data for that topic.",
      intent: intentRes,
      extract: extractRes,
    };
  }

  return {
    chartType: intentRes.chart_type,
    labels: extractRes.labels,
    values: extractRes.values,
    series: extractRes.series,
    data: extractRes.data,
    sourceHints: extractRes.source_hints,
    raw: extractRes.raw_agentic,
  };
}
