import fs from "fs";
import path from "path";

export async function createPrescriptionHandler(req, res) {

  try {

      const encounterId = req.params.id;
          const prescription = req.body;

              const eventsDir = path.join("data", "events", encounterId);

                  if (!fs.existsSync(eventsDir)) {
                        fs.mkdirSync(eventsDir, { recursive: true });
                            }

                                const file = path.join(eventsDir, "prescriptions.json");

                                    let records = [];

                                        if (fs.existsSync(file)) {
                                              records = JSON.parse(fs.readFileSync(file));
                                                  }

                                                      const record = {
                                                            ...prescription,
                                                                  createdAt: new Date().toISOString()
                                                                      };

                                                                          records.push(record);

                                                                              fs.writeFileSync(file, JSON.stringify(records, null, 2));

                                                                                  res.json({
                                                                                        status: "stored",
                                                                                              encounterId,
                                                                                                    prescription: record
                                                                                                        });

                                                                                                          } catch (err) {

                                                                                                              console.error("Prescription error:", err);

                                                                                                                  res.status(500).json({
                                                                                                                        error: "Failed to store prescription"
                                                                                                                            });

                                                                                                                              }

                                                                                                                              }