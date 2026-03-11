import express from "express";
import { createPrescriptionHandler } from "../controllers/prescriptionController.js";

const router = express.Router();

router.post("/:id/prescription", createPrescriptionHandler);

export default router;