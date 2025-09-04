import React, { useEffect, useState } from "react";
import axios from "axios";

export function StatusChecker() {
  const [status, setStatus] = useState({
    gemini: false,
    serpapi: false,
    loading: true,
  });

  useEffect(() => {
    checkServices();
  }, []);

  const checkServices = async () => {
    setStatus({ gemini: false, serpapi: false, loading: true });

    try {
      // Check Google Gemini API via Proxy
      const geminiResponse = await axios.post(
        "http://localhost:5000/gemini", // ✅ Use your proxy
        {
          prompt: "Test prompt",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Check SERP API
      const serpResponse = await axios.get("http://localhost:5000/serpapi", {
        params: {
          q: "test",
          engine: "google",
          gl: "us",
          hl: "en",
        },
      });

      setStatus({
        gemini: geminiResponse.status === 200,
        serpapi: serpResponse.status === 200,
        loading: false,
      });
    } catch (error) {
      console.error("API status check failed:", error.message);
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg">
      <h3 className="font-semibold mb-2">System Status</h3>
      <ul className="space-y-1 text-sm">
        <li className="flex items-center gap-2">
          Google Gemini API:{" "}
          {status.loading ? (
            "Checking..."
          ) : (
            <span className={status.gemini ? "text-green-500" : "text-red-500"}>
              {status.gemini ? "✓" : "✗"}
            </span>
          )}
        </li>
        <li className="flex items-center gap-2">
          SERP API:{" "}
          {status.loading ? (
            "Checking..."
          ) : (
            <span
              className={status.serpapi ? "text-green-500" : "text-red-500"}
            >
              {status.serpapi ? "✓" : "✗"}
            </span>
          )}
        </li>
      </ul>
    </div>
  );
}
