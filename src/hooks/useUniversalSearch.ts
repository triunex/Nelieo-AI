import { useEffect, useRef, useState } from "react";

export interface UniversalRecord {
  id: string;
  [key: string]: any;
}
export interface UniversalUpdateEvent {
  id: string;
  patch: any;
}
export interface UniversalIntent {
  entityType: string;
  filters?: Record<string, any>;
}

interface Options {
  autoStart?: boolean;
  location?: { lat: number; lon: number };
}

export function useUniversalSearch(query: string, opts: Options = {}) {
  const { autoStart = true, location } = opts;
  const [records, setRecords] = useState<UniversalRecord[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [intent, setIntent] = useState<UniversalIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!autoStart || !query) return;
    const params = new URLSearchParams({ q: query });
    if (location) {
      params.set("lat", String(location.lat));
      params.set("lon", String(location.lon));
    }
    const url = `/api/universal-search/stream?${params.toString()}`;
    setLoading(true);
    setError(null);
    setDone(false);
    setRecords([]);
    setColumns([]);
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("intent", (e: any) => {
      try {
        setIntent(JSON.parse(e.data));
      } catch {}
    });
    es.addEventListener("columns", (e: any) => {
      try {
        const { columns } = JSON.parse(e.data);
        setColumns(columns);
      } catch {}
    });
    es.addEventListener("record", (e: any) => {
      try {
        const rec = JSON.parse(e.data);
        setRecords((prev) => {
          if (prev.find((p) => p.id === rec.id)) return prev;
          return [...prev, rec];
        });
      } catch {}
    });
    es.addEventListener("update", (e: any) => {
      try {
        const upd: UniversalUpdateEvent = JSON.parse(e.data);
        setRecords((prev) =>
          prev.map((r) => (r.id === upd.id ? { ...r, ...upd.patch } : r))
        );
      } catch {}
    });
    es.addEventListener("done", () => {
      setDone(true);
      setLoading(false);
      es.close();
    });
    es.addEventListener("error", (e: any) => {
      setError("stream error");
      setLoading(false);
    });

    return () => {
      es.close();
    };
  }, [query, autoStart, location?.lat, location?.lon]);

  return { records, columns, intent, loading, error, done };
}
