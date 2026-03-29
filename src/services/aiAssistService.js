// src/services/aiAssistService.js

export function processAIConversation(input) {
  const {
    symptoms = [],
    vitals = {},
    conversation = []
  } = input;

  let questions = [];
  let missingData = [];
  let riskLevel = "LOW";
  let suggestedAction = "CONTINUE";
  let explanation = [];

  // -----------------------------
  // 1. CHECK MISSING SYMPTOMS
  // -----------------------------
  if (!symptoms || symptoms.length === 0) {
    questions.push("What symptoms is the patient experiencing?");
    missingData.push("symptoms");
  }

  // -----------------------------
  // 2. CHECK VITALS
  // -----------------------------
  if (!vitals.heartRate) {
    questions.push("Please provide heart rate.");
    missingData.push("heartRate");
  }

  if (!vitals.temperature) {
    questions.push("Please provide temperature.");
    missingData.push("temperature");
  }

  if (!vitals.oxygen) {
    questions.push("Please provide oxygen saturation (SpO2).");
    missingData.push("oxygen");
  }

  // -----------------------------
  // 3. RISK DETECTION LOGIC
  // -----------------------------
  if (vitals.heartRate > 120) {
    riskLevel = "HIGH";
    explanation.push("Heart rate above 120 bpm");
  }

  if (vitals.temperature > 38.5) {
    riskLevel = "HIGH";
    explanation.push("High fever detected");
  }

  if (symptoms.includes("chest pain")) {
    riskLevel = "HIGH";
    explanation.push("Chest pain present");
  }

  if (symptoms.includes("shortness of breath")) {
    riskLevel = "HIGH";
    explanation.push("Respiratory distress symptoms");
  }

  // -----------------------------
  // 4. ESCALATION SUGGESTION
  // -----------------------------
  if (riskLevel === "HIGH") {
    suggestedAction = "ESCALATE";
  }

  // -----------------------------
  // 5. AI RESPONSE TONE (IMPORTANT)
  // -----------------------------
  let message = "";

  if (questions.length > 0) {
    message = questions.join(" ");
  } else {
    message = `Based on current inputs, there is an elevated risk pattern. I suggest considering escalation for doctor review.`;
  }

  return {
    message,
    questions,
    missingData,
    riskLevel,
    suggestedAction,
    explanation
  };
    }
