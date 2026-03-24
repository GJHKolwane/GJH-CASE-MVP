import express from "express";
import { doctorReviewHandler } from "../handlers/doctorReview.handler.js";

const router = express.Router();

/*
=========================================
DOCTOR FINAL REVIEW
POST /encounters/:id/doctor/review
=========================================
*/

router.post("/:id/doctor/review", doctorReviewHandler);

export default router;
