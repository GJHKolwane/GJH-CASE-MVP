import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  processCaseState,
  enforceTransition,
  actionMap
} from "../services/clinicalStateMachine.js";

const router = express.Router();

const dataDir = path.resolve("data");
const encountersFile = path.join(dataDir, "encounters.json");

const readJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

/*
================================================
LAB ORDER
================================================
*/

router.post("/:id/labs/service-request", async (req, res) => {
  try {
    const encounterId = req.params.id;
    const labOrder = req.body;

    const { doctorId } = labOrder;

    if (!doctorId) {
      return res.status(400).json({
        error: "doctorId is required"
      });
    }

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const nextState = actionMap.lab_order;
    const check = enforceTransition(encounter.status, nextState);

    if (!check.allowed) {
      return res.status(400).json({ error: check.error });
    }

    encounter.labs = encounter.labs || { orders: [], results: [] };

    const timestamp = new Date().toISOString();

    const newOrder = {
      id: crypto.randomUUID(),
      resourceType: "ServiceRequest",
      code: labOrder.code || { text: "Unknown Test" },
      subject: encounter.subject,
      createdAt: timestamp,
      requestedBy: { doctorId, timestamp }
    };

    encounter.labs.orders.push(newOrder);
    encounter.status = nextState;

    encounter.timeline.push({
      event: "Lab order created",
      data: newOrder,
      timestamp
    });

    const updated = await processCaseState(encounter);

    const index = encounters.findIndex(e => e.id === encounterId);
    encounters[index] = updated;

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Lab ordered", order: newOrder });

  } catch (err) {
    console.error("LAB ORDER ERROR:", err);
    return res.status(500).json({ error: "Failed to order lab" });
  }
});

/*
================================================
LAB RESULT
================================================
*/

router.post("/:id/labs/observation", async (req, res) => {
  try {
    const encounterId = req.params.id;
    const labResult = req.body;

    const { labTechId } = labResult;

    if (!labTechId) {
      return res.status(400).json({
        error: "labTechId is required"
      });
    }

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const nextState = actionMap.lab_result;
    const check = enforceTransition(encounter.status, nextState);

    if (!check.allowed) {
      return res.status(400).json({ error: check.error });
    }

    encounter.labs = encounter.labs || { orders: [], results: [] };

    const timestamp = new Date().toISOString();

    const newResult = {
      id: crypto.randomUUID(),
      resourceType: "Observation",
      ...labResult,
      recordedBy: { labTechId, timestamp },
      createdAt: timestamp
    };

    encounter.labs.results.push(newResult);
    encounter.status = nextState;

    encounter.timeline.push({
      event: "Lab result recorded",
      data: newResult,
      timestamp
    });

    const updated = await processCaseState(encounter);

    const index = encounters.findIndex(e => e.id === encounterId);
    encounters[index] = updated;

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Lab result recorded", result: newResult });

  } catch (err) {
    console.error("LAB RESULT ERROR:", err);
    return res.status(500).json({ error: "Failed to store lab result" });
  }
});

export default router;
