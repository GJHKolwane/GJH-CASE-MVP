export async function recordVitals(req, res) {
  try {
    const { encounterId, vitals } = req.body;

    if (!encounterId || !vitals) {
      return res.status(400).json({
        error: "encounterId and vitals are required"
      });
    }

    // 👉 For now mock storage (replace with DB later)
    const stored = {
      encounterId,
      vitals,
      recordedAt: new Date().toISOString()
    };

    return res.status(200).json({
      status: "vitals recorded",
      data: stored
    });

  } catch (err) {
    console.error("Vitals error:", err);
    res.status(500).json({
      error: "Failed to record vitals"
    });
  }
}
