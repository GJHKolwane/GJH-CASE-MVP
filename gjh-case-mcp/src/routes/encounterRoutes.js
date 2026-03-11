import express from "express";

import {
  createEncounterHandler,
    getEncountersHandler,
      getEncounterHandler,
        getEncounterTimelineHandler
        } from "../controllers/encounterController.js";

        import { recordVitalsHandler } from "../controllers/vitalsController.js";
        import { recordSymptomsHandler } from "../controllers/symptomsController.js";
        import { recordNotesHandler } from "../controllers/notesController.js";

        const router = express.Router();

        /*
        =====================================
        ENCOUNTER LIFECYCLE
        =====================================
        */

        router.post("/", createEncounterHandler);

        router.get("/", getEncountersHandler);

        router.get("/:id", getEncounterHandler);

        router.get("/:id/timeline", getEncounterTimelineHandler);

        /*
        =====================================
        CLINICAL EVENTS
        =====================================
        */

        router.post("/:id/vitals", recordVitalsHandler);

        router.post("/:id/symptoms", recordSymptomsHandler);

        router.post("/:id/notes", recordNotesHandler);

        export default router;