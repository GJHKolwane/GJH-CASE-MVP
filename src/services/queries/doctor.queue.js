// src/services/queries/doctor.queue.js

import { query } from "../../config/db.js";

export async function getDoctorQueue() {
  const res = await query(`
      SELECT id, encounter_data, status, updated_at
          FROM encounters
              WHERE status IN ('handover_pending', 'doctor_active')
                  ORDER BY updated_at ASC
                    `);

                      return res.rows.map(row => {
                          const ed = row.encounter_data || {};

                              return {
                                    id: row.id,
                                          status: row.status,
                                                updated_at: row.updated_at,

                                                      patient: ed.patient || {},
                                                            severity: ed.decision?.severity || "unknown",

                                                                  summary:
                                                                          ed.ai?.summary ||
                                                                                  ed.symptoms?.description ||
                                                                                          "No summary available"
                                                                                              };
                                                                                                });
                                                                                                }