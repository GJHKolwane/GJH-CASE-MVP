import express from "express";
import { createVitalsHandler } from "../controllers/vitalsController.js";

const router = express.Router();

/*
POST /encounters/:id/vitals
*/

router.post("/:id/vitals", createVitalsHandler);

export default router;