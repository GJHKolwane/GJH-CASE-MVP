import express from "express";
import { recordNotes } from "../controllers/notesController.js";

const router = express.Router();

/*
====================================
Record nurse clinical notes
====================================
*/

router.post("/:id/notes", recordNotes);

export default router;
