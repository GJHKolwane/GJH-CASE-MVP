import { getEncounterById, updateEncounter } from "../models/encounterModel.js";
import { addTimelineEvent } from "../services/timelineLogger.js";

export const recordSymptoms = async (req, res) => {

  try {

    const encounterId = req.params.id;
    const symptoms = req.body;

    const encounter = await getEncounterById(encounterId);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    encounter.symptoms = symptoms;

    addTimelineEvent(
      encounter,
      "SYMPTOMS_RECORDED",
      symptoms
    );

    await updateEncounter(encounterId, encounter);

    res.json(encounter);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to record symptoms"
    });

  }

};
