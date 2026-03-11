import fs from "fs";
import path from "path";

/*
==================================================
CREATE TRIAGE EVENT
==================================================
Stores triage decision in encounter timeline
*/

export async function createTriageHandler(req, res) {

  try {

      const encounterId = req.params.id;

          const triageData = req.body;

              if (!encounterId) {
                    return res.status(400).json({
                            error: "encounterId required"
                                  });
                                      }

                                          const eventsDir = path.join("data", "events", encounterId);

                                              if (!fs.existsSync(eventsDir)) {
                                                    fs.mkdirSync(eventsDir, { recursive: true });
                                                        }

                                                            const triageFile = path.join(eventsDir, "triage.json");

                                                                let triageEvents = [];

                                                                    if (fs.existsSync(triageFile)) {
                                                                          const raw = fs.readFileSync(triageFile);
                                                                                triageEvents = JSON.parse(raw);
                                                                                    }

                                                                                        triageEvents.push({
                                                                                              ...triageData,
                                                                                                    createdAt: new Date().toISOString()
                                                                                                        });

                                                                                                            fs.writeFileSync(
                                                                                                                  triageFile,
                                                                                                                        JSON.stringify(triageEvents, null, 2)
                                                                                                                            );

                                                                                                                                res.json({
                                                                                                                                      status: "stored",
                                                                                                                                            encounterId,
                                                                                                                                                  triage: triageData
                                                                                                                                                      });

                                                                                                                                                        } catch (err) {

                                                                                                                                                            console.error("Triage store error:", err);

                                                                                                                                                                res.status(500).json({
                                                                                                                                                                      error: "Failed to store triage"
                                                                                                                                                                          });

                                                                                                                                                                            }

                                                                                                                                                                            }