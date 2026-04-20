// src/services/queries/nurse.queue.js

import { query } from "../../config/db.js";

export async function getNurseQueue() {
  const res = await query(`
      SELECT id, encounter_data, status, updated_at
          FROM encounters
              WHERE status = 'validated'
                  ORDER BY updated_at ASC
                    `);

                      return res.rows.map(row => {
                          const ed = row.encounter_data || {};

                              return {
                                    id: row.id,
                                          status: row.status,
                                                updated_at: row.updated_at,

                                                      patient: ed.patient || {},

                                                            symptoms: ed.symptoms || null,
                                                                  vitals: ed.vitals || null,

                                                                        ai_flag: ed.ai?.risk || "unknown",
                                                                              severity: ed.decision?.severity || "unknown"
                                                                                  };
                                                                                    });
                                                                                    }