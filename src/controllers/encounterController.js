import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  processCaseState,
  enforceTransition,
  actionMap
} from "../services/clinicalStateMachine.js";

const file = path.resolve("data/encounters.json");

const read = () =>
  fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file))
    : [];

const write = (d) =>
  fs.writeFileSync(file, JSON.stringify(d, null, 2));

/*
================================================
CREATE
================================================
*/

export const createEncounterHandler = (req, res) => {
  const encounters = read();

  const encounter = {
    id: crypto.randomUUID(),
    status: "created",
    timeline: [],
    createdAt: new Date().toISOString()
  };

  encounters.push(encounter);
  write(encounters);

  res.json(encounter);
};

/*
================================================
INTAKE
================================================
*/

export const intakeHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const check = enforceTransition(e.status, actionMap.intake);
  if (!check.allowed) return res.status(400).json(check);

  e.intake = req.body;
  e.status = actionMap.intake;

  e.timeline.push({
    event: "Patient intake completed",
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
VITALS
================================================
*/

export const addVitalsHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const check = enforceTransition(e.status, actionMap.vitals);
  if (!check.allowed) return res.status(400).json(check);

  e.vitals = req.body;
  e.status = actionMap.vitals;

  e.timeline.push({
    event: "Vitals recorded",
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
SYMPTOMS
================================================
*/

export const addSymptomsHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const check = enforceTransition(e.status, actionMap.symptoms);
  if (!check.allowed) return res.status(400).json(check);

  e.symptoms = req.body;
  e.status = actionMap.symptoms;

  e.timeline.push({
    event: "Symptoms recorded",
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
NURSE
================================================
*/

export const nurseAssessmentHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const check = enforceTransition(e.status, actionMap.nurse);
  if (!check.allowed) return res.status(400).json(check);

  e.nurseNotes = req.body;
  e.status = actionMap.nurse;

  e.timeline.push({
    event: "Nurse assessment completed",
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
🔥 VALIDATION (NEW)
================================================
*/

export const validateEncounterHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const check = enforceTransition(e.status, actionMap.validate);
  if (!check.allowed) return res.status(400).json(check);

  e.validation = {
    clinician: req.body.clinician,
    notes: req.body.notes,
    timestamp: new Date().toISOString()
  };

  e.status = actionMap.validate;

  e.timeline.push({
    event: "Clinician validation completed",
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
DECISION
================================================
*/

export const decisionHandler = async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  const encounters = read();
  const e = encounters.find(x => x.id === id);

  const check = enforceTransition(e.status, actionMap.decision);
  if (!check.allowed) return res.status(400).json(check);

  e.decision = type;
  e.status = actionMap.decision;

  e.timeline.push({
    event: `Decision made: ${type}`,
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
TIMELINE
================================================
*/

export const getEncounterTimelineHandler = (req, res) => {
  const encounters = read();
  const e = encounters.find(x => x.id === req.params.id);

  if (!e) return res.status(404).json({ error: "Not found" });

  res.json({
    encounterId: e.id,
    state: e.status,
    timeline: e.timeline || []
  });
};
