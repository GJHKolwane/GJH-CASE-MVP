export async function recordNotes(req, res) {
  try {
    const { encounterId, notes } = req.body;

    if (!encounterId || !notes) {
      return res.status(400).json({
        error: "encounterId and notes are required"
      });
    }

    const stored = {
      encounterId,
      notes,
      recordedAt: new Date().toISOString()
    };

    return res.status(200).json({
      status: "notes recorded",
      data: stored
    });

  } catch (err) {
    console.error("Notes error:", err);
    res.status(500).json({
      error: "Failed to record notes"
    });
  }
}
