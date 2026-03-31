import { callOpenAI } from "./providers/openai.provider.js";
import { callMockAI } from "./providers/mock.provider.js";
// Future:
// import { callVertexAI } from "./providers/vertex.provider.js";
// import { callClinicalGPT } from "./providers/clinical.provider.js";

export async function callAIOrchestrator(input) {
const providers = [
callOpenAI,
callMockAI, // fallback always last
];

for (const provider of providers) {
try {
const response = await provider(input);

  if (response && response.riskLevel !== "unknown") {
    return {
      ...response,
      provider: provider.name,
    };
  }
} catch (error) {
  console.warn(`AI Provider failed: ${provider.name}`);
}

}

return {
message: "All AI providers failed",
riskLevel: "unknown",
suggestedAction: "fallback",
confidence: 0,
provider: "none",
};
}
