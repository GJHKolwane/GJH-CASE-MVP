import { getEncounterById, updateEncounter } from "../models/encounterModel.js";
import { addTimelineEvent } from "../services/timelineLogger.js";
import { canTransition } from "../services/clinicalStateMachine.js";

export const recordVitals = async (req, res) => {

  try {

    const encounterId = req.params.id;
    const vitals = req.body;

    const encounter = await getEncounterById(encounterId);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    /*
    ================================================
    STATE VALIDATION
    ================================================
    */

    if (!canTransition(encounter.state, "nurse_assessment")) {

      return res.status(400).json({
        error: "Encounter not ready for nurse assessment"
      });

    }

    encounter.state = "nurse_assessment";

    /*
    ================================================
    UPDATE VITALS
    ================================================
    */

    encounter.vitals = vitals;

    /*
    ================================================
    TIMELINE EVENT
    ================================================
    */

    addTimelineEvent(encounter, "VITALS_RECORDED", vitals);

    await updateEncounter(encounterId, encounter);

    res.json(encounter);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to record vitals"
    });

  }

};
