import express from "express";
import cors from "cors";

import patientRoutes from "./routes/patientRoutes.js";
import encounterRoutes from "./routes/encounterRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/patients", patientRoutes);
app.use("/encounters", encounterRoutes);

const PORT = 5050;

app.listen(PORT, () => {
console.log("GJH Case MCP running on port ${PORT}");
});