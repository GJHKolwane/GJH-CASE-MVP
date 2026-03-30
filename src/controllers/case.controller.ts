import { processCase } from "../services/case.service.js";

export async function handleCase(req, res) {
  try {
    const result = await processCase(req.body);
    res.json(result);
  } catch (error) {
    console.error("Case Processing Error:", error.message);
    res.status(500).json({
      message: "Case processing failed",
    });
  }
}
