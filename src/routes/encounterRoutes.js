import express from "express";

import {
createEncounterHandler,
intakeHandler,
addVitalsHandler,
addSymptomsHandler,
nurseAssessmentHandler,
decisionHandler,
getEncounterTimelineHandler,
validateEncounterHandler
} from "../controllers/encounterController.js";

import { getEncounterById } from "../models/encounterModel.js";

const router = express.Router();

/*

ENCOUNTER ENTRY

*/

router.post("/", createEncounterHandler);

/*

GET ENCOUNTER

*/

router.get("/:id", async (req, res) => {
try {
const encounter = await getEncounterById(req.params.id);

if (!encounter) {
  return res.status(404).json({
    error: "Encounter not found"
  });
}

return res.json(encounter);

} catch (error) {
console.error("GET ENCOUNTER ERROR:", error);

return res.status(500).json({
  error: "Failed to retrieve encounter"
});

}
});

/*

CLINICAL WORKFLOW (STRICT ORDER)

*/

// 1️⃣ Intake
router.post("/:id/intake", intakeHandler);

// 2️⃣ Vitals
router.post("/:id/vitals", addVitalsHandler);

// 3️⃣ Symptoms
router.post("/:id/symptoms", addSymptomsHandler);

// 4️⃣ Nurse
router.post("/:id/nurse", nurseAssessmentHandler);

// 5️⃣ 🔥 VALIDATION (NEW — HUMAN IN LOOP)
router.post("/:id/validate", validateEncounterHandler);

// 6️⃣ Decision (ONLY AFTER VALIDATION — enforced by FSM)
router.post("/:id/decision", decisionHandler);

/*

TIMELINE

*/

router.get("/:id/timeline", getEncounterTimelineHandler);

export default router;
