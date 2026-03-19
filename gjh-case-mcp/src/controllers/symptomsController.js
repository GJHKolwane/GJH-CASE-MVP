export async function recordSymptoms(req, res) {
  try {
    const { encounterId, symptoms } = req.body;

    if (!encounterId || !symptoms) {
      return res.status(400).json({
        error: "encounterId and symptoms are required"
      });
    }

    const stored = {
      encounterId,
      symptoms,
      recordedAt: new Date().toISOString()
    };

    return res.status(200).json({
      status: "symptoms recorded",
      data: stored
    });

  } catch (err) {
    console.error("Symptoms error:", err);
    res.status(500).json({
      error: "Failed to record symptoms"
    });
  }
}
