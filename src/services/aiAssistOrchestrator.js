// src/services/aiAssistOrchestrator.js

import { runAIRules } from "./ruleEngine.js";
import { callAIModel } from "./aiAdapter.js";

export async function runAIOrchestration(input) {
  const { symptoms, vitals, conversation } = input;

  // 1️⃣ Call AI (LLM later)
  const aiResponse = await callAIModel(input);

  // 2️⃣ Apply YOUR rules (safety layer)
  const ruleResult = runAIRules({
    symptoms,
    vitals,
    aiResponse
  });

  // 3️⃣ Merge results
  return {
    ...aiResponse,
    ...ruleResult
  };
}
