import fs from "fs";
import path from "path";

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
DOCTOR CONSULTATION
================================================
*/

export const doctorConsultationHandler = async (req, res) => {
  const { id } = req.params;
  const encounters = read();

  const e = encounters.find(x => x.id === id);

  const next = "doctor_consultation";
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.doctorConsultationStartedAt = new Date().toISOString();
  e.status = next;

  e.timeline.push({
    event: "Doctor consultation started",
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
DOCTOR NOTES
================================================
*/

export const doctorNotesHandler = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const encounters = read();
  const e = encounters.find(x => x.id === id);

  const next = actionMap.doctor_notes;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.doctorNotes = e.doctorNotes || [];

  e.doctorNotes.push({
    note,
    createdAt: new Date().toISOString()
  });

  e.status = next;

  e.timeline.push({
    event: "Doctor notes added",
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
DOCTOR DECISION
================================================
*/

export const doctorDecisionHandler = async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body; // prescription | lab

  const encounters = read();
  const e = encounters.find(x => x.id === id);

  const next = actionMap.doctor_decision;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.doctorDecision = decision;
  e.status = next;

  e.timeline.push({
    event: `Doctor decision: ${decision}`,
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};

/*
================================================
FINAL NOTES (AI + DOCTOR)
================================================
*/

export const finalNotesHandler = async (req, res) => {
  const { id } = req.params;
  const { summary } = req.body;

  const encounters = read();
  const e = encounters.find(x => x.id === id);

  const next = actionMap.final;
  const check = enforceTransition(e.status, next);

  if (!check.allowed) return res.status(400).json(check);

  e.finalSummary = summary;
  e.status = next;

  e.timeline.push({
    event: "Final notes completed",
    timestamp: new Date().toISOString()
  });

  const updated = await processCaseState(e);

  write(encounters);
  res.json(updated);
};
