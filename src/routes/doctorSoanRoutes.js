import express from "express";
import { createDoctorSOANHandler } from "../controllers/doctorSoanController.js";

const router = express.Router();

/*
=========================================
POST /encounters/:id/doctor-soan
=========================================
*/

router.post("/:id/doctor-soan", createDoctorSOANHandler);

export default router;
