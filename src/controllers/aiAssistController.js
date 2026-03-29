// src/controllers/aiAssistController.js

import { processAIConversation } from "../services/aiAssistService.js";

export const aiAssistHandler = async (req, res) => {
  try {
    const { symptoms, vitals, conversation } = req.body;

    const result = processAIConversation({
      symptoms,
      vitals,
      conversation
    });

    return res.status(200).json({
      status: "success",
      data: result
    });

  } catch (error) {
    console.error("AI Assist Error:", error);
    return res.status(500).json({
      status: "error",
      message: "AI Assist processing failed"
    });
  }
};
