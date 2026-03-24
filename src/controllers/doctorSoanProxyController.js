import axios from "axios";

/*
================================================
DOCTOR SOAN PROXY → ORCHESTRATOR
================================================
*/

export const doctorSOANProxyHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { triage, vitals } = req.body;

    // 🔥 Call AI Orchestrator
    const response = await axios.post(
      "http://localhost:8080/doctor/soan", // ← orchestrator endpoint
      {
        encounterId: id,
        triage,
        vitals
      }
    );

    return res.json(response.data);

  } catch (error) {
    console.error("SOAN PROXY ERROR:", error.message);

    return res.status(500).json({
      error: "Failed to generate SOAN via orchestrator"
    });
  }
};
