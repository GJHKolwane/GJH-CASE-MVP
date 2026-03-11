import express from "express";
import {
createEncounterHandler,
getEncountersHandler,
getEncounterHandler,
updateEncounterHandler,
getEncounterTimelineHandler
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
TIMELINE
=====================================
*/

router.get("/:id/timeline", getEncounterTimelineHandler);

export default router;