import express from "express";
import cors from "cors";

import encounterRoutes from "./routes/encounterRoutes.js";
import caseRoutes from "./routes/case.routes.js";


console.log("✅ server started, routes importing...");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/case", caseRoutes);

// ✅ CLEAN PREFIX
app.use("/encounters", encounterRoutes);

const PORT = 5050;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
