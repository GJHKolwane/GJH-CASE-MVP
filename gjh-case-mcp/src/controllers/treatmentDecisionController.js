import { getEncounterById, updateEncounter } from "../models/encounterModel.js";
import { addTimelineEvent } from "../services/timelineLogger.js";
import { canTransition } from "../services/clinicalStateMachine.js";

/*
=========================================
TREATMENT DECISION
=========================================
*/

export const createTreatmentDecisionHandler = async (req, res) => {

  try {

    const encounterId = req.params.id;

    const {
      decision,
      treatmentPlan,
      followUpRequired
    } = req.body;

    const encounter = await getEncounterById(encounterId);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    /*
    =========================================
    STATE VALIDATION
    =========================================
    */

    if (!canTransition(encounter.state, "treatment_decision")) {

      return res.status(400).json({
        error: "Doctor SOAN must be completed first"
      });

    }

    /*
    =========================================
    STORE DECISION
    =========================================
    */

    encounter.treatmentDecision = {
      decision,
      treatmentPlan,
      followUpRequired: followUpRequired || false,
      decidedAt: new Date().toISOString()
    };

    encounter.state = "treatment_decision";

    /*
    =========================================
    TIMELINE EVENT
    =========================================
    */

    addTimelineEvent(
      encounter,
      "TREATMENT_DECISION_RECORDED",
      encounter.treatmentDecision
    );

    /*
    =========================================
    UPDATE ENCOUNTER
    =========================================
    */

    await updateEncounter(encounterId, encounter);

    res.json(encounter);

  } catch (err) {

    console.error("Treatment decision error:", err);

    res.status(500).json({
      error: "Failed to record treatment decision"
    });

  }

};
