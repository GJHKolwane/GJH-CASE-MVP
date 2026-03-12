import express from "express";
import { generateDoctorSOAN } from "../controllers/doctorSoanController.js";

const router = express.Router();

router.post("/:id/doctor-soan", generateDoctorSOAN);

export default router;
