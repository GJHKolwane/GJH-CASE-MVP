import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  processCaseState,
  enforceTransition,
  actionMap
} from "../services/clinicalStateMachine.js";

const file = path.resolve("data/encounters.json");

const read = () => fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file))
  : [];

const write = (d) =>
  fs.writeFileSync(file, JSON.stringify(d, null, 2));

/*
================================================
LAB ORDER
================================================
*/

export const orderLabHandler = async (req, res) => {
  const { id } = req.params;
  const { test, doctorId } = req.body;

  const encounters = read();
  const e = encounters.find(x => x.id === id);

  const next = actionMap.lab_order;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.labs = e.labs || { orders: [], results: [] };

  const order = {
    id: crypto.randomUUID(),
    test,
    doctorId,
    createdAt: new Date().toISOString()
  };

  e.labs.orders.push(order);
  e.status = next;

  e.timeline.push({
    event: "Lab ordered",
    data: order,
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
LAB RESULT
================================================
*/

export const recordLabResultHandler = async (req, res) => {
  const { id } = req.params;
  const { result, labTechId } = req.body;

  const encounters = read();
  const e = encounters.find(x => x.id === id);

  const next = actionMap.lab_result;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.labs = e.labs || { orders: [], results: [] };

  const labResult = {
    id: crypto.randomUUID(),
    result,
    labTechId,
    createdAt: new Date().toISOString()
  };

  e.labs.results.push(labResult);
  e.status = next;

  e.timeline.push({
    event: "Lab result recorded",
    data: labResult,
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};
