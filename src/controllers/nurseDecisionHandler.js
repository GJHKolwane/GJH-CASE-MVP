import pool from "../config/db.js";

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

    /*
    ========================================
    🔥 FETCH ENCOUNTER
    ========================================
    */
    const result = await pool.query(
      "SELECT * FROM encounters WHERE id = $1",
      [id]
    );

    const encounter = result.rows[0];

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const data = encounter.encounter_data || {};

    // ✅ NEW AI FIELD (FIXED)
    const ai = data.ai;

    if (!ai) {
      return res.status(400).json({
        error: "AI assessment not found. Run symptoms first.",
      });
    }

    /*
    ========================================
    🧠 FINAL DECISION LOGIC
    ========================================
    */
    let finalAssessment;

    if (action === "ACCEPT") {
      finalAssessment = {
        ...ai,
        source: "AI_CONFIRMED_BY_NURSE",
        nurseNotes: notes,
      };

    } else if (action === "OVERRIDE") {
      if (!decision) {
        return res.status(400).json({
          error: "Override requires decision data",
        });
      }

      finalAssessment = {
        riskLevel: decision.riskLevel || "LOW",
        escalation: decision.escalation === true,
        explanation: decision.explanation || [],
        confidence: decision.confidence || 0.7,
        source: "NURSE_OVERRIDE",
        nurseNotes: notes,
      };

    } else {
      return res.status(400).json({
        error: "Invalid action",
      });
    }

    /*
    ========================================
    🔥 STATUS LOGIC
    ========================================
    */
    const status =
      finalAssessment.escalation === true
        ? "DOCTOR_REVIEW"
        : "COMPLETE";

    /*
    ========================================
    💾 UPDATE DATA STRUCTURE
    ========================================
    */
    const updatedData = {
      ...data,

      // ✅ SINGLE SOURCE OF TRUTH
      ai,

      // ✅ FULL AUDIT TRAIL
      assessment: {
        ai,
        nurseDecision,
        final: finalAssessment,
      },

      finalSeverity: finalAssessment.riskLevel,

      escalation: {
        status: finalAssessment.escalation
          ? "ESCALATED"
          : "NONE",
      },
    };

    await pool.query(
      `
      UPDATE encounters
      SET encounter_data = $1, status = $2
      WHERE id = $3
      `,
      [updatedData, status, id]
    );

    /*
    ========================================
    🚀 RESPONSE
    ========================================
    */
    return res.json({
      message: "Nurse decision processed",
      status,
      finalAssessment,
    });

  } catch (err) {
    console.error("❌ nurseDecisionHandler ERROR:", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export default nurseDecisionHandler;
