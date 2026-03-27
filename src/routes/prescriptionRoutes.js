import express from "express";
const router = express.Router();
import { createPrescriptionHandler } from "../controllers/prescriptionController.js";

const router = express.Router();

router.post("/:id/prescription", createPrescriptionHandler);

export default router;
