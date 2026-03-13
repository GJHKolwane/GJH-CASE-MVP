import express from "express";
import { recordDoctorSOAN } from "../controllers/doctorSoanController.js";

const router = express.Router();

/*
=========================================
POST /encounters/:id/doctor-soan
=========================================
*/

router.post("/:id/doctor-soan", recordDoctorSOAN);

export default router;
