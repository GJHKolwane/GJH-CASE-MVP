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
CREATE (PATIENT ARRIVES)
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
1️⃣ PATIENT INTAKE
================================================
*/

export const intakeHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const next = actionMap.intake;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.intake = req.body;
  e.status = next;

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
2️⃣ VITALS
================================================
*/

export const addVitalsHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const next = actionMap.vitals;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.vitals = req.body;
  e.status = next;

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
3️⃣ SYMPTOMS
================================================
*/

export const addSymptomsHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const next = actionMap.symptoms;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.symptoms = req.body;
  e.status = next;

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
4️⃣ NURSE ASSESSMENT (AI WILL FOLLOW)
================================================
*/

export const nurseAssessmentHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const next = actionMap.nurse;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.nurseNotes = req.body;
  e.status = next;

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
5️⃣ DECISION (LOW / MEDIUM)
================================================
*/

export const decisionHandler = async (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // low / medium / escalate

  const encounters = read();
  const e = encounters.find(x => x.id === id);

  const next = actionMap.decision;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.decision = type;
  e.status = next;

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
GET TIMELINE
================================================
*/

export const getEncounterTimelineHandler = (req, res) => {
  try {
    const { id } = req.params;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    return res.json({
      timeline: encounter.timeline || []
    });

  } catch (err) {
    console.error("TIMELINE ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch timeline"
    });
  }
};
