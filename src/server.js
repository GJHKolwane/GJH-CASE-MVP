import express from "express";
import cors from "cors";

import encounterRoutes from "./routes/encounterRoutes.js";
console.log("✅ server started, routes importing...");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ CLEAN PREFIX
app.use("/encounters", encounterRoutes);

const PORT = 5050;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
