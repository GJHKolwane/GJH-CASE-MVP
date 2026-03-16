import express from "express";

import {
createEncounterHandler,
getEncountersHandler,
getEncounterHandler,
updateEncounterHandler,
getEncounterTimelineHandler,
addVitalsHandler,
addSymptomsHandler,
addNotesHandler,
addTriageHandler
} from "../controllers/encounterController.js";

const router = express.Router();

/*
=====================================
ENCOUNTER MANAGEMENT
=====================================
*/

router.post("/", createEncounterHandler);

router.get("/", getEncountersHandler);

router.get("/:id", getEncounterHandler);

router.patch("/:id", updateEncounterHandler);

/*
=====================================
EVENT INGESTION
=====================================
*/

router.post("/:id/vitals", addVitalsHandler);

router.post("/:id/symptoms", addSymptomsHandler);

router.post("/:id/notes", addNotesHandler);

router.post("/:id/triage", addTriageHandler);

/*
=====================================
TIMELINE
=====================================
*/

router.get("/:id/timeline", getEncounterTimelineHandler);

export default router;
