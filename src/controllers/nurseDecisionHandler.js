const db = require("../models"); // adjust if needed

const nurseDecisionHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { nurseDecision } = req.body;

    if (!nurseDecision) {
      return res.status(400).json({ error: "Missing nurseDecision" });
    }

    const { action, notes, decision } = nurseDecision;

    if (!notes || !action) {
      return res.status(400).json({
        error: "Action and notes are required",
      });
    }

    // 🔥 FETCH ENCOUNTER
    const encounter = await db.Encounter.findByPk(id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const data = encounter.encounter_data || {};

    const ai = data.aiAssessment;

    if (!ai) {
      return res.status(400).json({
        error: "AI assessment not found. Run triage first.",
      });
    }

    // 🔥 FINAL DECISION LOGIC
    let finalAssessment;

    if (action === "ACCEPT") {
      finalAssessment = {
        ...ai,
        source: "AI_CONFIRMED_BY_NURSE",
      };
    } else if (action === "OVERRIDE") {
      if (!decision) {
        return res.status(400).json({
          error: "Override requires decision data",
        });
      }

      finalAssessment = {
        ...decision,
        reasoning: notes,
        source: "NURSE_OVERRIDE",
      };
    } else {
      return res.status(400).json({
        error: "Invalid action type",
      });
    }

    // 🔥 DETERMINE STATUS
    let status = "COMPLETE";

    if (finalAssessment.escalation === true) {
      status = "DOCTOR_REVIEW";
    }

    // 🔥 SAVE BACK INTO ENCOUNTER
    const updatedData = {
      ...data,
      assessment: {
        ai,
        nurseDecision,
        final: finalAssessment,
      },
      finalSeverity: finalAssessment.riskLevel,
      escalation: {
        status: finalAssessment.escalation ? "ESCALATED" : "NONE",
      },
    };

    encounter.encounter_data = updatedData;
    encounter.status = status;

    await encounter.save();

    return res.json({
      message: "Nurse decision processed successfully",
      status,
      assessment: updatedData.assessment,
    });

  } catch (err) {
    console.error("❌ nurseDecisionHandler ERROR:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

module.exports = nurseDecisionHandler;
