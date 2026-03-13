import express from "express";
import { recordSymptoms } from "../controllers/symptomsController.js";

const router = express.Router();

/*
====================================
Record patient symptoms
====================================
*/

router.post("/:id/symptoms", recordSymptoms);

export default router;
