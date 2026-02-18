import React, { useState } from "react";
import { useUniversalSearch } from "../hooks/useUniversalSearch";

export default function UniversalSearchDemo() {
  const [q, setQ] = useState("ai engineers near me");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const loc =
    lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : undefined;
  const { records, columns, intent, loading, done } = useUniversalSearch(q, {
    location: loc,
  });

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Universal Search Demo</h1>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Query"
          style={{ flex: "1 1 300px" }}
        />
        <input
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Lat (optional)"
          style={{ width: 140 }}
        />
        <input
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          placeholder="Lon (optional)"
          style={{ width: 140 }}
        />
      </div>
      {intent && (
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Intent: {intent.entityType}
        </div>
      )}
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Columns: {columns.join(", ")}
      </div>
      <div style={{ margin: "0.5rem 0", fontSize: 12 }}>
        {loading && "Loading..."} {done && "Done."}
      </div>
      <div
        style={{
          maxHeight: "60vh",
          overflow: "auto",
          border: "1px solid #333",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              {columns.map((c) => (
                <th key={c} style={thStyle}>
                  {c}
                </th>
              ))}
              <th style={thStyle}>Score</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td style={tdStyle}>{r.name}</td>
                {columns.map((c) => (
                  <td key={c} style={tdStyle}>
                    {formatCell(r, c)}
                  </td>
                ))}
                <td style={tdStyle}>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(r: any, c: string) {
  const v = r[c] ?? r.attributes?.[c];
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object" && v !== null) return JSON.stringify(v);
  return v == null ? "" : String(v);
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "4px 6px",
  borderBottom: "1px solid #555",
  position: "sticky",
  top: 0,
  background: "#111",
};
const tdStyle: React.CSSProperties = {
  padding: "4px 6px",
  borderBottom: "1px solid #222",
  fontSize: 12,
};
