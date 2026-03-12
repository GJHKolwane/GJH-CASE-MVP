import express from "express";
import cors from "cors";

import patientRoutes from "./routes/patientRoutes.js";
import encounterRoutes from "./routes/encounterRoutes.js";

import vitalsRoutes from "./routes/vitalsRoutes.js";
import symptomsRoutes from "./routes/symptomsRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";

import triageRoutes from "./routes/triageRoutes.js";
import soanRoutes from "./routes/soanRoutes.js";
import doctorSoanRoutes from "./routes/doctorSoanRoutes.js";

import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import doctorNotesRoutes from "./routes/doctorNotesRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/patients", patientRoutes);
app.use("/encounters", encounterRoutes);

app.use("/encounters", vitalsRoutes);
app.use("/encounters", symptomsRoutes);
app.use("/encounters", notesRoutes);

app.use("/encounters", triageRoutes);
app.use("/encounters", soanRoutes);
app.use("/encounters", doctorSoanRoutes);

app.use("/encounters", doctorNotesRoutes);
app.use("/encounters", prescriptionRoutes);

const PORT = 5050;

app.listen(PORT, () => {

  console.log(`GJH Case MCP running on port ${PORT}`);

});
