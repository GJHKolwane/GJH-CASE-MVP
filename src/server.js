import express from "express";
import cors from "cors";

/*
=========================================
ROUTES (CLEAN GJHEALTH ARCHITECTURE)
=========================================
*/

import patientRoutes from "./routes/patientRoutes.js";
import encounterRoutes from "./routes/encounterRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import labRoutes from "./routes/labRoutes.js";

/*
=========================================
APP INITIALIZATION
=========================================
*/

const app = express();

app.use(cors());
app.use(express.json());

/*
=========================================
CORE SYSTEM
=========================================
*/

// Patient registry
app.use("/patients", patientRoutes);

// Main clinical workflow (intake → nurse → decision)
app.use("/encounters", encounterRoutes);

// Doctor authority layer
app.use("/doctor", doctorRoutes);

// Lab system
app.use("/labs", labRoutes);

/*
=========================================
HEALTH CHECK
=========================================
*/

app.get("/", (req, res) => {
  res.send("GJHealth API Running 🚀");
});

/*
=========================================
SERVER
=========================================
*/

const PORT = 5050;

app.listen(PORT, () => {
  console.log(`🚀 GJHealth running on port ${PORT}`);
});
