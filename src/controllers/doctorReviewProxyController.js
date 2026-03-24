import axios from "axios";

export const doctorReviewProxyHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, edits } = req.body;

    const response = await axios.post(
      "http://localhost:8080/doctor/review",
      {
        encounterId: id,
        approved,
        edits
      }
    );

    return res.json(response.data);

  } catch (error) {
    console.error("REVIEW PROXY ERROR:", error.message);

    return res.status(500).json({
      error: "Failed to finalize SOAN via orchestrator"
    });
  }
};
