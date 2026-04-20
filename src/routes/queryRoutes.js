// src/routes/queryRoutes.js

import express from "express";
import {
  getSOAN,
    doctorQueue,
      nurseQueue,
        getHistory
        } from "../controllers/queryController.js";

        const router = express.Router();

        /*
        ================================================
        READ API (QUERY LAYER)
        ================================================
        */

        router.get("/doctor/queue", doctorQueue);
        router.get("/nurse/queue", nurseQueue);
        router.get("/encounter/:id/soan", getSOAN);
        router.get("/encounter/:id/history", getHistory);

        export default router;