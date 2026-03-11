import fs from "fs";
import path from "path";

/*
=========================================
STORE SOAN EVENT
=========================================
*/

export async function createSOANHandler(req, res) {

  try {

      const encounterId = req.params.id;
          const soan = req.body;

              if (!encounterId) {
                    return res.status(400).json({
                            error: "encounterId required"
                                  });
                                      }

                                          const eventsDir = path.join("data", "events", encounterId);

                                              if (!fs.existsSync(eventsDir)) {
                                                    fs.mkdirSync(eventsDir, { recursive: true });
                                                        }

                                                            const file = path.join(eventsDir, "soan.json");

                                                                let records = [];

                                                                    if (fs.existsSync(file)) {
                                                                          records = JSON.parse(fs.readFileSync(file));
                                                                              }

                                                                                  const record = {
                                                                                        subjective: soan.subjective || "",
                                                                                              objective: soan.objective || "",
                                                                                                    assessment: soan.assessment || "",
                                                                                                          nextSteps: soan.nextSteps || "",
                                                                                                                createdAt: new Date().toISOString()
                                                                                                                    };

                                                                                                                        records.push(record);

                                                                                                                            fs.writeFileSync(file, JSON.stringify(records, null, 2));

                                                                                                                                res.json({
                                                                                                                                      status: "stored",
                                                                                                                                            encounterId,
                                                                                                                                                  soan: record
                                                                                                                                                      });

                                                                                                                                                        } catch (err) {

                                                                                                                                                            console.error("SOAN error:", err);

                                                                                                                                                                res.status(500).json({
                                                                                                                                                                      error: "Failed to store SOAN"
                                                                                                                                                                          });

                                                                                                                                                                            }

                                                                                                                                                                            }