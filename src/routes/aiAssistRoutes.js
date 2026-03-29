// src/routes/aiAssistRoutes.js

import express from "express";
import { aiAssistHandler } from "../controllers/aiAssistController.js";

const router = express.Router();

router.post("/ai-assist", aiAssistHandler);

export default router;
