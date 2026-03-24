import express from "express";
import { doctorReviewProxyHandler } from "../controllers/doctorReviewProxyController.js";

const router = express.Router();

router.post("/:id/doctor/review", doctorReviewProxyHandler);

export default router;
