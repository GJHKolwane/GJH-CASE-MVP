import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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
CREATE LAB ORDER (FHIR: ServiceRequest)
================================================
*/

router.post("/:id/labs/service-request", (req, res) => {
  try {
    const encounterId = req.params.id;
    const labOrder = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    // Initialize labs structure
    encounter.labs = encounter.labs || {
      orders: [],
      results: []
    };

    const newOrder = {
      id: crypto.randomUUID(),
      resourceType: "ServiceRequest",
      status: labOrder.status || "active",
      intent: labOrder.intent || "order",
      code: labOrder.code || { text: "Unknown Test" },
      priority: labOrder.priority || "routine",
      subject: encounter.subject,
      createdAt: new Date().toISOString()
    };

    encounter.labs.orders.push(newOrder);

    // Timeline integration
    encounter.timeline = encounter.timeline || [];
    encounter.timeline.push({
      event: "Lab order created",
      data: newOrder,
      timestamp: new Date().toISOString()
    });

    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Lab order created",
      order: newOrder,
      encounterId
    });

  } catch (err) {
    console.error("LAB ORDER ERROR:", err);

    return res.status(500).json({
      error: "Failed to create lab order"
    });
  }
});

/*
================================================
STORE LAB RESULT (FHIR: Observation)
================================================
*/

router.post("/:id/labs/observation", (req, res) => {
  try {
    const encounterId = req.params.id;
    const labResult = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    encounter.labs = encounter.labs || {
      orders: [],
      results: []
    };

    // Basic clinical interpretation
    let flag = "normal";

    if (labResult?.valueQuantity?.value !== undefined) {
      const value = labResult.valueQuantity.value;

      if (value > 11000) flag = "high";
      else if (value < 4000) flag = "low";
    }

    const newResult = {
      id: crypto.randomUUID(),
      resourceType: "Observation",
      status: labResult.status || "final",
      code: labResult.code || { text: "Unknown Observation" },
      valueQuantity: labResult.valueQuantity,
      referenceRange: labResult.referenceRange || [],
      interpretation: flag,
      createdAt: new Date().toISOString()
    };

    encounter.labs.results.push(newResult);

    // Timeline integration
    encounter.timeline = encounter.timeline || [];
    encounter.timeline.push({
      event: "Lab result recorded",
      data: newResult,
      timestamp: new Date().toISOString()
    });

    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Lab result stored",
      result: newResult,
      encounterId
    });

  } catch (err) {
    console.error("LAB RESULT ERROR:", err);

    return res.status(500).json({
      error: "Failed to store lab result"
    });
  }
});

export default router;
