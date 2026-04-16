import express from "express";
import cors from "cors";

import encounterRoutes from "./routes/encounterRoutes.js";


console.log("✅ server started, routes importing...");

const app = express();

// ========================================
// 🔥 CORS FIX (CODESPACES SAFE)
// ========================================
app.use(cors({
  origin: true,              // dynamically allow all origins
  credentials: true,         // allow cookies/auth headers
}));

// 🔥 EXTRA HEADERS (ENSURE NO BLOCKING)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  // handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// ========================================
// 🔹 MIDDLEWARE
// ========================================
app.use(express.json());

// ========================================
// 🔹 ROUTES
// ========================================
app.use("/encounters", encounterRoutes);

// ========================================
// 🔹 HEALTH CHECK (VERY USEFUL)
// ========================================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "GJH Clinical MCP",
    time: new Date(),
  });
});

// ========================================
// 🔹 START SERVER
// ========================================
const PORT = 5050;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
