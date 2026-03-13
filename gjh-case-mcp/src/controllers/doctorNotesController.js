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
    ENSURE DOCTOR NOTES ARRAY EXISTS
    ================================================
    */

    if (!encounter.doctorNotes) {
      encounter.doctorNotes = [];
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

    const doctorNoteEntry = {
      consultationNotes,
      assessment,
      diagnosis,
      recordedAt: new Date().toISOString()
    };

    encounter.doctorNotes.push(doctorNoteEntry);

    /*
    ================================================
    TIMELINE EVENT
    ================================================
    */

    addTimelineEvent(
      encounter,
      "DOCTOR_CONSULTATION_RECORDED",
      doctorNoteEntry
    );

    /*
    ================================================
    UPDATE ENCOUNTER
    ================================================
    */

    await updateEncounter(encounterId, encounter);

    res.json(encounter);

  } catch (err) {

    console.error("Doctor notes error:", err);

    res.status(500).json({
      error: "Failed to record doctor notes"
    });

  }

};
