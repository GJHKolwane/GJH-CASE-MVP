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

app.use(cors());
app.use(express.json());

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

const PORT = 5050;

app.listen(PORT, () => {

  console.log(`GJH Case MCP running on port ${PORT}`);

  });