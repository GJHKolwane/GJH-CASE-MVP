import express from "express";
import { createNotesHandler } from "../controllers/notesController.js";

const router = express.Router();

router.post("/:id/notes", createNotesHandler);

export default router;