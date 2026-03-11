import express from "express";
import { createSymptomsHandler } from "../controllers/symptomsController.js";

const router = express.Router();

router.post("/:id/symptoms", createSymptomsHandler);

export default router;