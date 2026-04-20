// src/services/queries/soan.query.js

import { query } from "../../config/db.js";

export async function getSOANView(encounterId) {
  const res = await query(
      `SELECT encounter_data 
           FROM encounters 
                WHERE id = $1::uuid`,
                    [encounterId]
                      );

                        if (!res.rows[0]) throw new Error("Encounter not found");

                          const ed = res.rows[0].encounter_data || {};

                            return {
                                encounterId,

                                    patient: ed.patient || {},

                                        S: {
                                              intake: ed.intake || null,
                                                    symptoms: ed.symptoms || null,
                                                          ai_summary: ed.ai?.summary || null
                                                              },

                                                                  O: {
                                                                        vitals: ed.vitals || null,
                                                                              ai_findings: ed.ai?.findings || null
                                                                                  },

                                                                                      A: {
                                                                                            ai_assessment: ed.ai?.assessment || null,
                                                                                                  decision: ed.decision || {},
                                                                                                        nurse_validation: ed.validation || {}
                                                                                                            },

                                                                                                                N: {
                                                                                                                      doctor_notes: ed.doctorSession?.notes || null,
                                                                                                                            treatment: ed.doctorSession?.treatment || null,
                                                                                                                                  follow_up: ed.doctorSession?.followUp || null,
                                                                                                                                        appointment: ed.appointment || null
                                                                                                                                            }
                                                                                                                                              };
                                                                                                                                              }