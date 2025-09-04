// src/services/searchService.ts

import axios from "axios";

// ✳️ Type Definitions
export interface Source {
  title: string;
  snippet: string;
  link: string;
}

export interface SearchResponse {
  answer: string;
  results: Array<{
    id: string;
    title: string;
    content: string;
    url: string;
  }>;
  sources: SearchSource[]; // Add the 'sources' property
  images?: string[]; // Optional images for richer rendering
}

// Define and export SearchSource type
export type SearchSource = {
  title: string;
  url: string;
  snippet?: string;
};

// 🔍 Fetch Results from SERP API via Proxy
export async function fetchSearchResults(query: string): Promise<any[]> {
  try {
    const RENDER_BASE =
      (window as any).__COGNIX_RENDER_BASE__ ||
      "https://cognix-api.onrender.com";
    // Server will apply persisted user instructions; send raw query
    const userId =
      (window as any)?.auth?.currentUser?.uid ||
      (window as any).__COGNIX_USER_ID__ ||
      "demo";
    const response = await fetch(`${RENDER_BASE}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    return data.answer; // This will contain Gemini's summarized answer
  } catch (error: any) {
    console.error("fetchSearchResults error:", error.message);
    throw new Error("Failed to fetch search results.");
  }
}

// 🤖 Generate Answer Using Google Gemini API via Proxy
async function generateGeminiAnswer(
  query: string,
  searchResults: Source[],
  mode: "chat" | "search" | "agentic",
  model: string = "gemini-1.5-flash"
): Promise<string> {
  try {
    const context = searchResults
      .slice(0, 5)
      .map((r) => `${r.title}: ${r.snippet}\n${r.link}`)
      .join("\n\n");

    const prompt = `You are a helpful AI assistant and your Name is Nelieo and you are made by a Nelieo.AI . Please analyze the following information and provide a comprehensive answers:

Context:
${context}

Question: ${query}

Please provide a clear and detailed response based on the above context.`;

    const userId =
      (window as any)?.auth?.currentUser?.uid ||
      (window as any).__COGNIX_USER_ID__ ||
      "demo";
    const response = await fetch("https://cognix-api.onrender.com/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ query: prompt }),
    });

    const data = await response.json();

    return data.answer || "No response.";
  } catch (error: any) {
    console.error("generateGeminiAnswer error:", error.message);
    return "An error occurred while generating the answer. Please try again.";
  }
}

// Function to clean and rank search results
function cleanAndRankResults(results: any[]): any[] {
  if (!results || results.length === 0) return [];

  const seenTitles = new Set();
  const filtered = results
    .filter((res) => res.snippet && res.snippet.length > 50) // Ignore weak snippets
    .filter((res) => {
      const title = res.title?.toLowerCase().trim();
      if (seenTitles.has(title)) return false;
      seenTitles.add(title);
      return true;
    })
    .sort((a, b) => {
      const scoreA =
        (a.snippet.length || 0) + (a.position ? 100 - a.position : 0);
      const scoreB =
        (b.snippet.length || 0) + (b.position ? 100 - b.position : 0);
      return scoreB - scoreA;
    });

  return filtered.slice(0, 5); // Return top 5 results
}

// 🚀 Perform Search + Return Both Answer & Results
export async function performSearch(
  query: string,
  mode: "chat" | "search" | "agentic" = "search",
  model: string = "gemini-1.5-flash"
): Promise<SearchResponse> {
  try {
    if (mode === "agentic") {
      const userId =
        (window as any)?.auth?.currentUser?.uid ||
        (window as any).__COGNIX_USER_ID__ ||
        "demo";
      const r = await fetch("https://cognix-api.onrender.com/api/agentic-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ query }),
      });
      const data = await r.json();
      // Use formatted_answer if available, fallback to raw_answer or generic answer
      const answerText =
        data.formatted_answer || data.raw_answer || data.answer || "No answer";
      return {
        answer: answerText,
        results:
          data.top_chunks?.map((t: any) => ({
            id: t.chunk.id,
            title: t.chunk.source?.title || t.chunk.source?.type,
            content: t.chunk.text,
            url: t.chunk.source?.url || "",
          })) || [],
        sources: (data.sources || []).map((s: any) => ({
          title: s.title || s.url || s.handle,
          url: s.url || s.handle || "",
          snippet: "",
        })),
        images: Array.isArray(data.images) ? data.images : [],
      };
    }

    const results = await fetchSearchResults(query);
    const validResults = Array.isArray(results) ? results : [];

    // Clean and rank results
    const cleanedResults = cleanAndRankResults(validResults);

    // Always ensure we have a valid answer
    const answer = await generateGeminiAnswer(
      query,
      cleanedResults,
      mode,
      model
    );

    // Return both the AI answer and the SerpAPI results
    return {
      answer,
      results: validResults, // Return raw SerpAPI results
      sources: cleanedResults.map((result) => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
      })), // Map cleaned results to sources
    };
  } catch (err: any) {
    console.error("performSearch error:", err);
    // Return a valid structure even in error case
    return {
      answer: "Sorry, something went wrong. Please try again.",
      results: [],
      sources: [], // Ensure 'sources' is included in the error case
    };
  }
}
