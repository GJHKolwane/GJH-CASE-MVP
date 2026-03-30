import express from "express";
import { handleCase } from "../controllers/case.controller";

const router = express.Router();

router.post("/process", handleCase);

export default router;
