import { getEncounterById, updateEncounter } from "../models/encounterModel.js";
import { addTimelineEvent } from "../services/timelineLogger.js";
import { canTransition } from "../services/clinicalStateMachine.js";

/*
================================================
RECORD NURSE NOTES
================================================
*/

export const recordNotes = async (req, res) => {

  try {

    const encounterId = req.params.id;
    const { notes } = req.body;

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
    Nurse notes must happen during nurse assessment
    */

    if (!canTransition(encounter.state, "nurse_assessment")) {

      return res.status(400).json({
        error: "Encounter not ready for nurse notes"
      });

    }

    encounter.state = "nurse_assessment";

    /*
    ================================================
    STORE NURSE NOTES
    ================================================
    */

    encounter.notes = notes;

    /*
    ================================================
    TIMELINE EVENT
    ================================================
    */

    addTimelineEvent(
      encounter,
      "NURSE_NOTES_RECORDED",
      { notes }
    );

    await updateEncounter(encounterId, encounter);

    res.json(encounter);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to record nurse notes"
    });

  }

};
