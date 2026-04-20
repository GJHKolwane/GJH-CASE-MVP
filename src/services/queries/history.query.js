// src/services/queries/history.query.js

import { query } from "../../config/db.js";

export async function getEncounterHistory(encounterId) {
  const res = await query(
      `SELECT encounter_data 
           FROM encounters 
                WHERE id = $1::uuid`,
                    [encounterId]
                      );

                        if (!res.rows[0]) throw new Error("Encounter not found");

                          const history = res.rows[0].encounter_data?.history || [];

                            return history.map(entry => ({
                                from: entry.from,
                                    to: entry.to,
                                        actor: entry.actor,
                                            timestamp: entry.timestamp
                                              }));
                                              }