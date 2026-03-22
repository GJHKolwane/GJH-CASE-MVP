import { getEncounterById, updateEncounter } from "../models/encounterModel.js";
import { addTimelineEvent } from "../services/timelineLogger.js";
import { canTransition } from "../services/clinicalStateMachine.js";

/*
=========================================
GENERATE DOCTOR SOAN
=========================================
*/

export const createDoctorSoanHandler = async (req, res) => {
  try {
    const encounterId = req.params.id;

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
        error: "Doctor consultation must happen first"
      });
    }

    /*
    =========================================
    GET LAST DOCTOR NOTES
    =========================================
    */

    const lastDoctorNote =
      encounter.doctorNotes?.[encounter.doctorNotes.length - 1];

    if (!lastDoctorNote) {
      return res.status(400).json({
        error: "Doctor notes required before generating SOAN"
      });
    }

    /*
    =========================================
    BUILD DOCTOR SOAN
    =========================================
    */

    if (!encounter.soan) {
      encounter.soan = {};
    }

    encounter.soan.doctor = {
      subjective: lastDoctorNote.consultationNotes || "",
      objective: encounter.vitals || {},
      assessment: lastDoctorNote.assessment || "",
      nextSteps: lastDoctorNote.diagnosis || "",
      createdAt: new Date().toISOString()
    };

    encounter.state = "treatment_decision";

    /*
    =========================================
    TIMELINE EVENT
    =========================================
    */

    addTimelineEvent(
      encounter,
      "SOAN_DOCTOR_GENERATED",
      encounter.soan.doctor
    );

    /*
    =========================================
    UPDATE ENCOUNTER
    =========================================
    */

    await updateEncounter(encounterId, encounter);

    return res.json({
      status: "doctor_soan_generated",
      encounterId,
      soan: encounter.soan.doctor
    });

  } catch (err) {
    console.error("Doctor SOAN error:", err);

    return res.status(500).json({
      error: "Failed to generate doctor SOAN"
    });
  }
};
