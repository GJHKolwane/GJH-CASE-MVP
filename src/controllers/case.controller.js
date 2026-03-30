import { processCase } from "../services/case.service.js";

export async function handleCase(req: any, res: any) {
  try {
    const result = await processCase(req.body);

    res.json(result);
  } catch (error: any) {
    console.error("Case Processing Error:", error.message);

    res.status(500).json({
      message: "Case processing failed",
    });
  }
}
