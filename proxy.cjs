const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config(); // Load environment variables from .env

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
