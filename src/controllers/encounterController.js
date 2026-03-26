import {
  getEncounter,
  saveEncounter,
  createEncounter as createEncounterService
} from "../services/encounterService.js";

/*
================================================
CREATE ENCOUNTER
================================================
POST /encounters
================================================
*/

export const createEncounter = (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        error: "patientId is required"
      });
    }

    const encounter = createEncounterService(patientId);

    return res.status(201).json({
      message: "Encounter created successfully",
      encounter
    });

  } catch (err) {
    console.error("CREATE ENCOUNTER ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to create encounter",
      details: err.message
    });
  }
};

/*
================================================
GET ENCOUNTER
================================================
GET /encounters/:id
================================================
*/

export const fetchEncounter = (req, res) => {
  try {
    const { id } = req.params;

    const encounter = getEncounter(id);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    return res.json({
      encounter
    });

  } catch (err) {
    console.error("FETCH ENCOUNTER ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to fetch encounter",
      details: err.message
    });
  }
};

/*
================================================
UPDATE ENCOUNTER STAGE (GENERIC STATE UPDATE)
================================================
PATCH /encounters/:id/stage
================================================
*/

export const updateEncounterStage = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const encounter = getEncounter(id);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    // Merge updates into encounter
    const updatedEncounter = {
      ...encounter,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveEncounter(updatedEncounter);

    return res.json({
      message: "Encounter updated",
      encounter: updatedEncounter
    });

  } catch (err) {
    console.error("UPDATE ENCOUNTER ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to update encounter",
      details: err.message
    });
  }
};

/*
================================================
ADD CLINICAL NOTES
================================================
POST /encounters/:id/notes
================================================
*/

export const addNotes = (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const encounter = getEncounter(id);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    encounter.notesHistory = encounter.notesHistory || [];

    const newNote = {
      note,
      createdAt: new Date().toISOString()
    };

    encounter.notesHistory.push(newNote);

    saveEncounter(encounter);

    return res.json({
      message: "Notes added",
      encounter
    });

  } catch (err) {
    console.error("ADD NOTES ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to add notes",
      details: err.message
    });
  }
};

/*
================================================
ATTACH LAB RESULT SUMMARY TO ENCOUNTER
(Bridges Labs → Clinical Flow)
================================================
PATCH /encounters/:id/labs/summary
================================================
*/

export const attachLabSummary = (req, res) => {
  try {
    const { id } = req.params;
    const { summary } = req.body;

    const encounter = getEncounter(id);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    encounter.labs = encounter.labs || {
      orders: [],
      results: []
    };

    encounter.labs.summary = summary;
    encounter.updatedAt = new Date().toISOString();

    saveEncounter(encounter);

    return res.json({
      message: "Lab summary attached",
      encounter
    });

  } catch (err) {
    console.error("LAB SUMMARY ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to attach lab summary",
      details: err.message
    });
  }
};
