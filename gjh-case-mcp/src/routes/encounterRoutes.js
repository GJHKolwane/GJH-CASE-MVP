import express from "express";
import {
createEncounterHandler,
getEncountersHandler,
getEncounterHandler,
updateEncounterHandler
} from "../controllers/encounterController.js";

const router = express.Router();

router.post("/", createEncounterHandler);

router.get("/", getEncountersHandler);

router.get("/:id", getEncounterHandler);

router.patch("/:id", updateEncounterHandler);

export default router;