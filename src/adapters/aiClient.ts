import axios from "axios";

const AI_BASE_URL = process.env.AI_ORCHESTRATOR_URL || "http://localhost:8087";

export async function callAIOrchestrator(payload) {
  try {
    const response = await axios.post(`${AI_BASE_URL}/ai/assist`, payload, {
      timeout: 5000,
    });

    return response.data;
  } catch (error) {
    console.error("AI Orchestrator Error:", error.message);

    return {
      message: "AI unavailable",
      riskLevel: "unknown",
      suggestedAction: "fallback",
      confidence: 0,
      explanation: "AI service unreachable",
    };
  }
}
