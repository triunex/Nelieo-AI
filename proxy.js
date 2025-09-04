import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env

console.log("SERP API Key:", process.env.VITE_SERPAPI_KEY || "Not Found");
console.log("Gemini API Key:", process.env.VITE_GEMINI_API_KEY || "Not Found");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Root route for testing
app.get("/", (req, res) => {
  res.send(
    "Proxy server is running. Use /serpapi and /gemini for API requests."
  );
});

// Proxy route for SERP API
app.get("/serpapi", async (req, res) => {
  const { q, engine, gl, hl } = req.query;

  try {
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        api_key: process.env.VITE_SERPAPI_KEY,
        q,
        engine,
        gl,
        hl,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching SERP API data:", error.message);
    res.status(500).json({ error: "Failed to fetch SERP API data" });
  }
});

// Proxy route for Google Gemini API
app.post("/gemini", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("👉 Prompt received:", prompt); // Debugging log

    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(geminiRes.data);
  } catch (err) {
    console.error("❌ Gemini Proxy Error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to reach Gemini API",
      details: err.response?.data || err.message,
    });
  }
});

// Temporary route to list available models
app.get("/gemini/models", async (req, res) => {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`
    );

    res.status(200).json(response.data);
  } catch (err) {
    console.error(
      "Error fetching Gemini models:",
      err.response?.data || err.message
    );
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch Gemini models",
      details: err.response?.data || err.message,
    });
  }
});

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
