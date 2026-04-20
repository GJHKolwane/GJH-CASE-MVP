import express from "express";
import cors from "cors";
import queryRoutes from "./src/routes/queryRoutes.js";

import encounterRoutes from "./routes/encounterRoutes.js";

console.log("✅ server started, routes importing...");

const app = express();

// ========================================
// 🔥 CLEAN CORS (NO CONFLICTS)
// ========================================
app.use(cors());

// ========================================
// 🔹 MIDDLEWARE
// ========================================
app.use(express.json());

// ========================================
// 🔹 ROUTES
// ========================================
app.use("/encounter", encounterRoutes);
app.use("/api", queryRoutes);
// ========================================
// 🔹 HEALTH CHECK
// ========================================
app.get("/", (req, res) => {
res.json({
status: "OK",
service: "GJH Clinical MCP",
time: new Date(),
});
});

// ========================================
// 🔹 START SERVER (CODESPACES SAFE)
// ========================================

const PORT = 5050;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
