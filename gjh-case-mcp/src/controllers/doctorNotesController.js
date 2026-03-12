import { getEncounterById, updateEncounter } from "../services/encounterService.js";

/*
================================================
CREATE DOCTOR NOTES EVENT
================================================
*/

export async function createDoctorNotesHandler(req, res) {

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

    const event = {
      consultationNotes,
      assessment,
      diagnosis,
      recordedAt: new Date().toISOString(),
      actor: "doctor"
    };

    if (!encounter.timeline) {
      encounter.timeline = {};
    }

    if (!encounter.timeline.doctorNotes) {
      encounter.timeline.doctorNotes = [];
    }

    encounter.timeline.doctorNotes.push(event);

    await updateEncounter(encounterId, encounter);

    res.json({
      status: "doctor notes recorded",
      encounterId,
      event
    });

  } catch (err) {

    console.error("Doctor notes error:", err);

    res.status(500).json({
      error: "Failed to record doctor notes"
    });

  }

}
