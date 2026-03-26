import express from "express";
import crypto from "crypto";
import { getEncounter, saveEncounter } from "../services/encounterService.js";

const router = express.Router();

/*

CREATE LAB ORDER (FHIR: ServiceRequest)

POST /encounters/:id/labs/service-request

*/

router.post("/encounters/:id/labs/service-request", (req, res) => {
try {
const encounterId = req.params.id;
const labOrder = req.body;

const encounter = getEncounter(encounterId);

if (!encounter) {
  return res.status(404).json({
    error: "Encounter not found"
  });
}

// Initialize labs structure if missing
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

saveEncounter(encounter);

return res.json({
  message: "Lab order created",
  order: newOrder,
  encounterId
});

} catch (err) {
console.error("LAB ORDER ERROR:", err.message);

return res.status(500).json({
  error: "Failed to create lab order",
  details: err.message
});

}
});

/*

STORE LAB RESULT (FHIR: Observation)

POST /encounters/:id/labs/observation

*/

router.post("/encounters/:id/labs/observation", (req, res) => {
try {
const encounterId = req.params.id;
const labResult = req.body;

const encounter = getEncounter(encounterId);

if (!encounter) {
  return res.status(404).json({
    error: "Encounter not found"
  });
}

// Initialize labs structure if missing
encounter.labs = encounter.labs || {
  orders: [],
  results: []
};

// Flag abnormal values (basic clinical logic)
let flag = "normal";

if (labResult?.valueQuantity?.value) {
  const value = labResult.valueQuantity.value;

  if (value > 11000) flag = "high";
  if (value < 4000) flag = "low";
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

saveEncounter(encounter);

return res.json({
  message: "Lab result stored",
  result: newResult,
  encounterId
});

} catch (err) {
console.error("LAB RESULT ERROR:", err.message);

return res.status(500).json({
  error: "Failed to store lab result",
  details: err.message
});

}
});

export default router;
