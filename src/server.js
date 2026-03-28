import express from "express";
import cors from "cors";

import encounterRoutes from "./routes/encounterRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/", encounterRoutes);

const PORT = 5050;

app.listen(PORT, () => {
console.log("🚀 Server running on port ${PORT}");
});
