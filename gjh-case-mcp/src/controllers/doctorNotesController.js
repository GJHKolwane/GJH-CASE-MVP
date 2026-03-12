import { getEncounterById, updateEncounter } from "../models/encounterModel.js";
import { addTimelineEvent } from "../services/timelineLogger.js";
import { canTransition } from "../services/clinicalStateMachine.js";

export const createDoctorNotesHandler = async (req, res) => {

  try {

    const encounterId = req.params.id;

    const {
      consultationNotes,
      assessment,
      diagnosis
    } = req.body;

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

    if (!canTransition(encounter.state, "doctor_consultation")) {

      return res.status(400).json({
        error: "Encounter not ready for doctor consultation"
      });

    }

    encounter.state = "doctor_consultation";

    /*
    ================================================
    STORE DOCTOR NOTES
    ================================================
    */

    encounter.doctorNotes.push({
      consultationNotes,
      assessment,
      diagnosis,
      recordedAt: new Date().toISOString()
    });

    /*
    ================================================
    TIMELINE EVENT
    ================================================
    */

    addTimelineEvent(
      encounter,
      "DOCTOR_CONSULTATION_RECORDED",
      { consultationNotes, assessment, diagnosis }
    );

    await updateEncounter(encounterId, encounter);

    res.json(encounter);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to record doctor notes"
    });

  }

};
