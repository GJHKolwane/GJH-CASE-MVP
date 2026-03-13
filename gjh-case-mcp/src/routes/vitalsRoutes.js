import express from "express";
import { recordVitals } from "../controllers/vitalsController.js";

const router = express.Router();

/*
====================================
Record patient vitals
====================================
*/

router.post("/:id/vitals", recordVitals);

export default router;
