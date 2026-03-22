import express from "express";
import { createSOANHandler } from "../controllers/soanController.js";

const router = express.Router();

/*
POST /encounters/:id/soan
Stores SOAN documentation for encounter
*/

router.post("/:id/soan", createSOANHandler);

export default router;