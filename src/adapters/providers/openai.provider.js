export async function callOpenAI(input) {
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
throw new Error("No OpenRouter API key");
}

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
method: "POST",
headers: {
"Authorization": "Bearer ${API_KEY}",
"Content-Type": "application/json",
},
body: JSON.stringify({
model: "mistralai/mistral-7b-instruct", // FREE MODEL
messages: [
{
role: "system",
content: "You are a clinical triage assistant. Return ONLY JSON.",
},
{
role: "user",
content: JSON.stringify(input),
},
],
}),
});

const data = await response.json();

const text = data.choices?.[0]?.message?.content;

if (!text) throw new Error("No response");

// ⚠️ Expect AI to return JSON string
const parsed = JSON.parse(text);

return {
message: parsed.message || "AI response",
riskLevel: parsed.riskLevel || "unknown",
suggestedAction: parsed.suggestedAction || "none",
confidence: parsed.confidence || 0.5,
};
}
