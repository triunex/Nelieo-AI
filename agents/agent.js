// agent.js
import express from "express";
import cors from "cors";

const app = express();
// Allow requests from the server proxy running on port 10000
app.use(cors({ origin: "http://localhost:10000" }));
app.use(express.json());

// Simple stub handler that always returns JSON and does not require a browser
app.post("/agent/run", async (req, res) => {
  try {
    const { prompt } = req.body || {};

    let result = "";
    if (typeof prompt === "string" && prompt.includes("YouTube")) {
      result = "Pretend I opened YouTube and searched ✅";
    } else {
      result = `No handler yet for: ${prompt || "(empty)"}`;
    }

    return res.json({ success: true, result });
  } catch (err) {
    console.error("Agent error:", err);
    return res
      .status(500)
      .json({ error: "Agent crashed", details: err.message });
  }
});

app.listen(7001, () => console.log("Agent running on 7001"));
