import express from "express";
import cors from "cors";

/*
==============================
ROUTES
==============================
*/

import patientRoutes from "./routes/patientRoutes.js";
import encounterRoutes from "./routes/encounterRoutes.js";

import vitalsRoutes from "./routes/vitalsRoutes.js";
import symptomsRoutes from "./routes/symptomsRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";

import triageRoutes from "./routes/triageRoutes.js";
import soanRoutes from "./routes/soanRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";

/*
==============================
APP SETUP
==============================
*/

const app = express();

/*
Allow requests from dashboard and orchestrator
*/
app.use(cors());

/*
Parse JSON body
*/
app.use(express.json());

/*
==============================
HEALTH CHECK
==============================
*/

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "gjh-case-service",
    timestamp: new Date().toISOString()
  });
});

/*
==============================
CORE RESOURCES
==============================
*/

app.use("/patients", patientRoutes);
app.use("/encounters", encounterRoutes);

/*
==============================
CLINICAL EVENTS
==============================
*/

app.use("/encounters", vitalsRoutes);
app.use("/encounters", symptomsRoutes);
app.use("/encounters", notesRoutes);

app.use("/encounters", triageRoutes);
app.use("/encounters", soanRoutes);
app.use("/encounters", prescriptionRoutes);

/*
==============================
SERVER
==============================
*/

const PORT = process.env.PORT || 5050;

app.listen(PORT, "0.0.0.0", () => {

  console.log(`🚀 GJH Case MCP running on port ${PORT}`);

});
