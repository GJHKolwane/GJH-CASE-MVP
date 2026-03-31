import fetch from "node-fetch";

export async function callAIOrchestrator(payload) {
  const response = await fetch(
    process.env.AI_ORCHESTRATOR_URL || "http://localhost:8087/ai/assist",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "AI Orchestrator failed");
  }

  return data.data;
}
