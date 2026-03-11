import fs from "fs";
import path from "path";

export async function createSymptomsHandler(req, res) {

  try {

      const encounterId = req.params.id;
          const symptoms = req.body;

              const eventsDir = path.join("data", "events", encounterId);

                  if (!fs.existsSync(eventsDir)) {
                        fs.mkdirSync(eventsDir, { recursive: true });
                            }

                                const file = path.join(eventsDir, "symptoms.json");

                                    let records = [];

                                        if (fs.existsSync(file)) {
                                              records = JSON.parse(fs.readFileSync(file));
                                                  }

                                                      const record = {
                                                            ...symptoms,
                                                                  createdAt: new Date().toISOString()
                                                                      };

                                                                          records.push(record);

                                                                              fs.writeFileSync(file, JSON.stringify(records, null, 2));

                                                                                  res.json({
                                                                                        status: "stored",
                                                                                              encounterId,
                                                                                                    symptoms: record
                                                                                                        });

                                                                                                          } catch (err) {

                                                                                                              console.error("Symptoms error:", err);

                                                                                                                  res.status(500).json({
                                                                                                                        error: "Failed to store symptoms"
                                                                                                                            });

                                                                                                                              }

                                                                                                                              }