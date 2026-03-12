import { getEncounterById, updateEncounter } from "../models/encounterModel.js";
import { addTimelineEvent } from "../services/timelineLogger.js";
import { canTransition } from "../services/clinicalStateMachine.js";

/*
================================================
GENERATE DOCTOR SOAN
================================================
*/

export const generateDoctorSOAN = async (req, res) => {

  try {

    const encounterId = req.params.id;

    const encounter = await getEncounterById(encounterId);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    /*
    ============================================
    STATE VALIDATION
    ============================================
    */

    if (!canTransition(encounter.state, "treatment_decision")) {

      return res.status(400).json({
        error: "Doctor consultation must occur first"
      });

    }

    const notes = encounter.doctorNotes[encounter.doctorNotes.length - 1];

    if (!notes) {
      return res.status(400).json({
        error: "Doctor notes required before SOAN"
      });
    }

    /*
    ============================================
    BUILD SOAN FROM DOCTOR NOTES
    ============================================
    */

    encounter.soan.doctor = {

      subjective: notes.consultationNotes || "",

      objective: encounter.vitals || {},

      assessment: notes.assessment || "",

      nextSteps: notes.diagnosis || ""

    };

    encounter.state = "treatment_decision";

    addTimelineEvent(
      encounter,
      "SOAN_DOCTOR_GENERATED",
      encounter.soan.doctor
    );

    await updateEncounter(encounterId, encounter);

    res.json(encounter.soan.doctor);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to generate doctor SOAN"
    });

  }

};
