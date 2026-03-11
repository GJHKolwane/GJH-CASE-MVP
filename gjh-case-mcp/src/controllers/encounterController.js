import fs from "fs/promises";
import path from "path";

import { getDB } from "../database/db.js";

/*
====================================================
HELPER — READ EVENT FILE SAFELY
====================================================
*/

async function readEventFile(filePath) {
  try {
      const raw = await fs.readFile(filePath);
          return JSON.parse(raw);
            } catch {
                return [];
                  }
                  }

                  /*
                  ====================================================
                  CREATE ENCOUNTER
                  ====================================================
                  */

                  export async function createEncounterHandler(req, res) {
                    const db = await getDB();

                      const { patientId } = req.body;

                        if (!patientId) {
                            return res.status(400).json({
                                  error: "patientId required"
                                      });
                                        }

                                          const encounter = {
                                              id: `enc_${Date.now()}`,
                                                  patientId,
                                                      status: "active",
                                                          createdAt: new Date().toISOString()
                                                            };

                                                              db.encounters.push(encounter);

                                                                await db.write();

                                                                  res.status(201).json(encounter);
                                                                  }

                                                                  /*
                                                                  ====================================================
                                                                  GET ALL ENCOUNTERS
                                                                  ====================================================
                                                                  */

                                                                  export async function getEncountersHandler(req, res) {
                                                                    const db = await getDB();
                                                                      res.json(db.encounters);
                                                                      }

                                                                      /*
                                                                      ====================================================
                                                                      GET SINGLE ENCOUNTER
                                                                      ====================================================
                                                                      */

                                                                      export async function getEncounterHandler(req, res) {
                                                                        const { id } = req.params;

                                                                          const db = await getDB();

                                                                            const encounter = db.encounters.find(e => e.id === id);

                                                                              if (!encounter) {
                                                                                  return res.status(404).json({
                                                                                        error: "Encounter not found"
                                                                                            });
                                                                                              }

                                                                                                res.json(encounter);
                                                                                                }

                                                                                                /*
                                                                                                ====================================================
                                                                                                TIMELINE ENDPOINT
                                                                                                ====================================================
                                                                                                GET /encounters/:id/timeline
                                                                                                ====================================================
                                                                                                */

                                                                                                export async function getEncounterTimelineHandler(req, res) {

                                                                                                  const { id } = req.params;

                                                                                                    const db = await getDB();

                                                                                                      const encounter = db.encounters.find(e => e.id === id);

                                                                                                        if (!encounter) {
                                                                                                            return res.status(404).json({
                                                                                                                  error: "Encounter not found"
                                                                                                                      });
                                                                                                                        }

                                                                                                                          const patient = db.patients.find(p => p.id === encounter.patientId);

                                                                                                                            const eventFolder = path.join("data", "events", id);

                                                                                                                              const vitals = await readEventFile(
                                                                                                                                  path.join(eventFolder, "vitals.json")
                                                                                                                                    );

                                                                                                                                      const symptoms = await readEventFile(
                                                                                                                                          path.join(eventFolder, "symptoms.json")
                                                                                                                                            );

                                                                                                                                              const notes = await readEventFile(
                                                                                                                                                  path.join(eventFolder, "notes.json")
                                                                                                                                                    );

                                                                                                                                                      const triage = await readEventFile(
                                                                                                                                                          path.join(eventFolder, "triage.json")
                                                                                                                                                            );

                                                                                                                                                              const soan = await readEventFile(
                                                                                                                                                                  path.join(eventFolder, "soan.json")
                                                                                                                                                                    );

                                                                                                                                                                      const prescriptions = await readEventFile(
                                                                                                                                                                          path.join(eventFolder, "prescriptions.json")
                                                                                                                                                                            );

                                                                                                                                                                              res.json({
                                                                                                                                                                                  patient,
                                                                                                                                                                                      encounter,
                                                                                                                                                                                          timeline: {
                                                                                                                                                                                                vitals,
                                                                                                                                                                                                      symptoms,
                                                                                                                                                                                                            notes,
                                                                                                                                                                                                                  triage,
                                                                                                                                                                                                                        soan,
                                                                                                                                                                                                                              prescriptions
                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                    }