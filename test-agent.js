// Simple test script to verify agent endpoints
import axios from "axios";

async function testAgentPipeline() {
  try {
    console.log("Testing /api/agent/plan...");
    const planRes = await axios.post("http://localhost:10000/api/agent/plan", {
      query: "create a simple todo app",
    });

    console.log("Plan created:", planRes.data.planId);
    console.log("Plan text:", planRes.data.planText);

    console.log("\nTesting /api/agent/run...");
    const runRes = await axios.post("http://localhost:10000/api/agent/run", {
      planId: planRes.data.planId,
      confirm: true,
    });

    console.log("Run started:", runRes.data.runId);

    console.log("\nTesting /api/agent/stream...");
    console.log(
      "Stream URL: http://localhost:10000/api/agent/stream?runId=" +
        runRes.data.runId
    );
  } catch (error) {
    console.error("Error details:", error.code, error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

testAgentPipeline();
