import { useState, useRef, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { FileImage, FileDown } from "lucide-react";
import "echarts-gl";

// Import ECharts modules
import {
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart,
  MapChart,
  FunnelChart,
  GaugeChart,
  TreeChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  TitleComponent,
  ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// Register components
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart as any,
  HeatmapChart,
  MapChart,
  FunnelChart,
  GaugeChart,
  TreeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  TitleComponent,
  ToolboxComponent,
  CanvasRenderer,
]);

const colorThemes = {
  blue: ["#3b82f6", "#60a5fa", "#bfdbfe"],
  dark: ["#111827", "#1f2937", "#374151"],
  neon: ["#a855f7", "#22d3ee", "#f43f5e"],
  minimal: ["#ffffff", "#e5e7eb", "#9ca3af"],
};

export default function ChartRendererECharts({
  chartType,
  labels,
  values,
  data, // NEW: optional data for advanced charts
}: {
  chartType?: string;
  labels?: string[];
  values?: number[];
  data?: any;
}) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [type, setType] = useState(chartType || "bar");
  const [colorTheme, setColorTheme] = useState("blue");
  const intervalRef = useRef<number | null>(null);
  const dynamicValuesRef = useRef<number[]>([]);
  const [isLight, setIsLight] = useState<boolean>(
    typeof document !== "undefined"
      ? !document.documentElement.classList.contains("dark")
      : true
  );
  const worldMapRegisteredRef = useRef(false);

  // Keep internal type in sync with incoming prop
  useEffect(() => {
    setType(chartType || "bar");
  }, [chartType]);

  // Observe theme changes (light/dark)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const target = document.documentElement;
    const obs = new MutationObserver(() => {
      setIsLight(!target.classList.contains("dark"));
    });
    obs.observe(target, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Clear any running realtime intervals on teardown or when dependencies change
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [type, data]);

  const handleExportPNG = async () => {
    if (exportRef.current) {
      const dataUrl = await toPng(exportRef.current);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "chart.png";
      link.click();
    }
  };

  const handleExportPDF = async () => {
    if (exportRef.current) {
      const dataUrl = await toPng(exportRef.current);
      const pdf = new jsPDF();
      pdf.addImage(dataUrl, "PNG", 10, 10, 180, 160);
      pdf.save("chart.pdf");
    }
  };

  const chartOptions: echarts.EChartsOption = {
    title: {
      text: `${type.toUpperCase()} Chart`,
      left: "center",
      textStyle: { color: isLight ? "#111827" : "#e5e7eb" },
    },
    tooltip: { trigger: "item" },
    legend: {
      top: "bottom",
      textStyle: { color: isLight ? "#111827" : "#e5e7eb" },
    },
    textStyle: { color: isLight ? "#111827" : "#e5e7eb" },
    series: [],
  };

  const commonData = (labels || []).map((label, i) => ({
    name: label,
    value: (values || [])[i],
  }));

  switch (type) {
    case "bar":
      chartOptions.xAxis = {
        type: "category",
        data: labels,
        axisLabel: { color: isLight ? "#111827" : "#e5e7eb" },
        axisLine: { lineStyle: { color: isLight ? "#94a3b8" : "#64748b" } },
      };
      chartOptions.yAxis = {
        type: "value",
        axisLabel: { color: isLight ? "#111827" : "#e5e7eb" },
        axisLine: { lineStyle: { color: isLight ? "#94a3b8" : "#64748b" } },
        splitLine: { lineStyle: { color: isLight ? "#e5e7eb" : "#334155" } },
      };
      chartOptions.series = [
        {
          type: "bar",
          data: values,
          itemStyle: { color: colorThemes[colorTheme][0] },
        },
      ];
      break;
    case "line":
      chartOptions.xAxis = {
        type: "category",
        data: labels,
        axisLabel: { color: isLight ? "#111827" : "#e5e7eb" },
        axisLine: { lineStyle: { color: isLight ? "#94a3b8" : "#64748b" } },
      };
      chartOptions.yAxis = {
        type: "value",
        axisLabel: { color: isLight ? "#111827" : "#e5e7eb" },
        axisLine: { lineStyle: { color: isLight ? "#94a3b8" : "#64748b" } },
        splitLine: { lineStyle: { color: isLight ? "#e5e7eb" : "#334155" } },
      };
      chartOptions.series = [
        {
          type: "line",
          data: values,
          smooth: true,
          itemStyle: { color: colorThemes[colorTheme][0] },
        },
      ];
      break;
    case "pie":
      chartOptions.series = [
        {
          type: "pie",
          radius: "50%",
          data: commonData,
        },
      ];
      break;
    case "radar":
      chartOptions.radar = { indicator: labels.map((l) => ({ name: l })) };
      chartOptions.series = [
        {
          type: "radar",
          data: [{ value: values, name: "Data" }],
        },
      ];
      break;
    case "scatter":
      chartOptions.xAxis = {};
      chartOptions.yAxis = {};
      chartOptions.series = [
        {
          type: "scatter",
          data: labels.map((l, i) => [i, values[i]]),
        },
      ];
      break;
    case "funnel":
      chartOptions.series = [
        {
          type: "funnel",
          data: commonData,
        },
      ];
      break;
    case "gauge":
      chartOptions.series = [
        {
          type: "gauge",
          progress: { show: true },
          detail: { valueAnimation: true, formatter: "{value}%" },
          data: [{ value: values[0], name: labels[0] }],
        },
      ];
      break;

    // New 3D charts (echarts-gl)
    case "bar3d":
      chartOptions.xAxis3D = { type: "category", data: labels };
      // ts-expect-error
      chartOptions.yAxis3D = { type: "category", data: ["Value"] };
      // ts-expect-error
      chartOptions.zAxis3D = { type: "value" };
      // ts-expect-error
      chartOptions.grid3D = { boxWidth: 200, boxDepth: 40 };
      chartOptions.series = [
        {
          type: "bar3D",
          data: (values || []).map((v, i) => [labels?.[i], "Value", v]),
          shading: "lambert",
        } as any,
      ];
      break;

    case "bar3dTransparent":
      // ts-expect-error
      chartOptions.xAxis3D = { type: "category", data: labels };
      // ts-expect-error
      chartOptions.yAxis3D = { type: "category", data: ["Value"] };
      // ts-expect-error
      chartOptions.zAxis3D = { type: "value" };
      // ts-expect-error
      chartOptions.grid3D = {
        boxWidth: 200,
        boxDepth: 40,
        light: { main: { intensity: 1.2 } },
      };
      chartOptions.series = [
        {
          type: "bar3D",
          data: (values || []).map((v, i) => [labels?.[i], "Value", v]),
          shading: "lambert",
          itemStyle: { opacity: 0.5, color: "#00f9ff" },
        } as any,
      ];
      break;

    case "scatter3d":
      // ts-expect-error
      chartOptions.xAxis3D = {};
      // ts-expect-error
      chartOptions.yAxis3D = {};
      // ts-expect-error
      chartOptions.zAxis3D = {};
      // ts-expect-error
      chartOptions.grid3D = {};
      chartOptions.series = [
        {
          type: "scatter3D",
          symbolSize: 12,
          data:
            data ||
            (labels || []).map((_, i) => [
              i,
              values?.[i] || 0,
              values?.[i] || 0,
            ]),
        } as any,
      ];
      break;

    case "line3d":
      // ts-expect-error
      chartOptions.xAxis3D = { type: "category", data: labels };
      // ts-expect-error
      chartOptions.yAxis3D = { type: "value" };
      // ts-expect-error
      chartOptions.zAxis3D = { type: "value" };
      // ts-expect-error
      chartOptions.grid3D = {};
      chartOptions.series = [
        {
          type: "line3D",
          data: data || (labels || []).map((l, i) => [l, i, values?.[i] || 0]),
          lineStyle: { width: 4 },
        } as any,
      ];
      break;

    case "surface3d":
      chartOptions.tooltip = {};
      chartOptions.visualMap = { show: false, min: -1, max: 1 };
      // ts-expect-error
      chartOptions.xAxis3D = {};
      // ts-expect-error
      chartOptions.yAxis3D = {};
      // ts-expect-error
      chartOptions.zAxis3D = {};
      // ts-expect-error
      chartOptions.grid3D = {};
      chartOptions.series = [
        {
          type: "surface",
          wireframe: { show: false },
          data: data || [],
        } as any,
      ];
      break;

    case "mapChoropleth3d":
      // Requires echarts.registerMap('world', worldGeoJson) somewhere in app init
      // ts-expect-error
      chartOptions.geo3D = {
        map: "world",
        shading: "lambert",
        itemStyle: { areaColor: isLight ? "#dbeafe" : "#0ea5e9" },
      };
      chartOptions.series = [
        {
          type: "bar3D",
          coordinateSystem: "geo3D",
          data:
            data && Array.isArray(data) && data.length
              ? data
              : [
                  { coord: [-74.006, 40.7128], value: 10 }, // NYC
                  { coord: [2.3522, 48.8566], value: 8 }, // Paris
                  { coord: [139.6917, 35.6895], value: 12 }, // Tokyo
                ],
        } as any,
      ];
      break;

    // Globe visualizations
    case "globeFlights":
      chartOptions.backgroundColor = isLight ? "#e5e7eb" : "#000";
      // ts-expect-error
      chartOptions.globe = {
        baseTexture:
          "https://echarts.apache.org/examples/data-gl/asset/world.topo.bathy.200401.jpg",
        heightTexture:
          "https://echarts.apache.org/examples/data-gl/asset/bathymetry_bw_composite_4k.jpg",
        shading: "realistic",
        light: { main: { intensity: 3 }, ambient: { intensity: 0.4 } },
      };
      chartOptions.series = [
        {
          type: "lines3D",
          coordinateSystem: "globe",
          effect: {
            show: true,
            trailWidth: 4,
            trailLength: 0.5,
            trailOpacity: 0.8,
            trailColor: "red",
          },
          data:
            data && Array.isArray(data) && data.length
              ? data
              : [
                  {
                    coords: [
                      [-74.0, 40.7],
                      [139.7, 35.6],
                    ],
                  }, // NYC -> Tokyo
                  {
                    coords: [
                      [-0.1276, 51.5072],
                      [103.8198, 1.3521],
                    ],
                  }, // London -> Singapore
                ],
        } as any,
      ];
      break;

    case "globeAirlines":
      chartOptions.backgroundColor = isLight ? "#e5e7eb" : "#000";
      // ts-expect-error
      chartOptions.globe = {
        baseTexture:
          "https://echarts.apache.org/examples/data-gl/asset/world.topo.bathy.200401.jpg",
        shading: "realistic",
        light: { main: { intensity: 3 }, ambient: { intensity: 0.4 } },
      };
      chartOptions.series = [
        {
          type: "scatter3D",
          coordinateSystem: "globe",
          symbol: "pin",
          symbolSize: 20,
          itemStyle: { color: "yellow" },
          data:
            data && Array.isArray(data) && data.length
              ? data
              : [
                  [-74.0, 40.7, 10], // NYC
                  [139.7, 35.6, 12], // Tokyo
                ],
        } as any,
      ];
      break;

    // Motion/animated
    case "barRace":
      chartOptions.xAxis = { max: "dataMax" } as any;
      chartOptions.yAxis = { type: "category", data: labels, inverse: true };
      chartOptions.series = [
        {
          realtimeSort: true,
          type: "bar",
          data: values,
          label: { show: true, position: "right" },
        },
      ];
      chartOptions.animationDuration = 3000 as any;
      chartOptions.animationEasing = "linear" as any;
      break;

    case "lineRace":
      chartOptions.xAxis = { type: "category", data: labels };
      chartOptions.yAxis = { type: "value" };
      chartOptions.series = [{ type: "line", data: values, smooth: true }];
      chartOptions.animationDuration = 3000 as any;
      break;

    case "bubbleGrowth":
      chartOptions.xAxis = {};
      chartOptions.yAxis = {};
      chartOptions.series = [
        {
          type: "scatter",
          data: (values || []).map((v, i) => [i, v, v]),
          symbolSize: (d: any) => d[2],
          animationDurationUpdate: 1000,
        },
      ];
      break;

    case "gaugeAnimated":
      chartOptions.series = [
        {
          type: "gauge",
          progress: { show: true },
          detail: { valueAnimation: true },
          data: [{ value: values?.[0] ?? 50 }],
        },
      ];
      break;

    case "realtimeChart":
      chartOptions.xAxis = { type: "category", data: labels };
      chartOptions.yAxis = { type: "value" };
      chartOptions.series = [{ type: "line", data: values }];
      break;
  }

  // Removed chart type toggle buttons per request; type is controlled by prop

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [type]);

  const handleChartReady = (chart: echarts.ECharts) => {
    // Register world geojson lazily for 3D geo charts
    if (type === "mapChoropleth3d" && !worldMapRegisteredRef.current) {
      fetch(
        "https://fastly.jsdelivr.net/npm/echarts@5/examples/data/asset/geo/world.json"
      )
        .then((r) => r.json())
        .then((geojson) => {
          echarts.registerMap("world", geojson);
          worldMapRegisteredRef.current = true;
          chart.resize();
          chart.setOption(chartOptions as any, { notMerge: true });
        })
        .catch(() => {
          // ignore; we already added graceful defaults
        });
    }

    // Real-time chart backed by agentic-v2 or provided endpoint
    if (type === "realtimeChart" || data?.realtime) {
      const intervalMs = data?.realtimeInterval || 6000;
      const endpoint =
        data?.realtimeEndpoint ||
        "https://cognix-api.onrender.com/api/extract-chart-data";
      const payload =
        data?.payload ||
        (data?.topic
          ? { topic: data.topic, chart_type: chartType || "line" }
          : null);

      const fetchAndUpdate = async () => {
        try {
          if (typeof endpoint === "string" && payload) {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const j = await res.json();
            const newLabels = j.labels || labels || [];
            const newValues = j.values || values || [];
            dynamicValuesRef.current = Array.isArray(newValues)
              ? [...newValues]
              : [];
            const sType = ["line", "bar"].includes(type)
              ? (type as any)
              : "line";
            chart.setOption(
              {
                xAxis: { type: "category", data: newLabels },
                series: [{ type: sType, data: dynamicValuesRef.current }],
              } as any,
              { notMerge: false }
            );
          } else if (typeof data?.fetcher === "function") {
            const out = await data.fetcher();
            const newLabels = out.labels || labels || [];
            const newValues = out.values || values || [];
            dynamicValuesRef.current = Array.isArray(newValues)
              ? [...newValues]
              : [];
            const sType = ["line", "bar"].includes(type)
              ? (type as any)
              : "line";
            chart.setOption(
              {
                xAxis: { type: "category", data: newLabels },
                series: [{ type: sType, data: dynamicValuesRef.current }],
              } as any,
              { notMerge: false }
            );
          } else {
            // Fallback: random updates if nothing specified
            const next = [
              ...dynamicValuesRef.current,
              Math.round(Math.random() * 100),
            ];
            if (next.length > 10) next.shift();
            dynamicValuesRef.current = next;
            chart.setOption({ series: [{ data: next }] });
          }
        } catch {
          // swallow to keep realtime loop alive
        }
      };

      dynamicValuesRef.current = Array.isArray(values) ? [...values] : [];
      if (intervalRef.current) clearInterval(intervalRef.current);
      // kick off immediately
      fetchAndUpdate();
      intervalRef.current = window.setInterval(fetchAndUpdate, intervalMs);
    }
  };

  return (
    <div
      className="relative rounded-xl p-4 shadow-lg my-6 border border-border bg-card/80 backdrop-blur-md"
      ref={exportRef}
    >
      {/* Export Buttons */}
      <div className="absolute top-3 right-3 flex gap-2 z-50">
        <button
          onClick={handleExportPNG}
          className="bg-muted p-2 rounded-full text-foreground hover:bg-muted/80 border border-border"
        >
          <FileImage size={16} />
        </button>
        <button
          onClick={handleExportPDF}
          className="bg-muted p-2 rounded-full text-foreground hover:bg-muted/80 border border-border"
        >
          <FileDown size={16} />
        </button>
      </div>

      {/* Color Scheme Selector */}
      <div className="flex gap-2 flex-wrap mb-2">
        {Object.keys(colorThemes).map((theme) => (
          <button
            key={theme}
            onClick={() => setColorTheme(theme)}
            className={`px-2 py-1 rounded-md text-xs ${
              colorTheme === theme
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart Type Toggle removed per request */}

      {/* Chart Display */}
      <ReactECharts
        echarts={echarts}
        option={chartOptions}
        style={{ height: 400 }}
        notMerge={true}
        lazyUpdate={true}
        theme={isLight ? undefined : "dark"}
        onChartReady={handleChartReady}
      />
    </div>
  );
}
