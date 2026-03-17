import fs from "fs";
import path from "path";

/*
==================================================
HELPERS
==================================================
*/

function ensureEventFolder(encounterId) {
  const dir = path.join("data", "events", encounterId);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
          }

            return dir;
            }

            function readJSON(filePath) {
              if (!fs.existsSync(filePath)) return [];

                const raw = fs.readFileSync(filePath);
                  return JSON.parse(raw);
                  }

                  function writeJSON(filePath, data) {
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                    }

                    /*
                    ==================================================
                    CREATE VITALS
                    ==================================================
                    */

                    export async function createVitalsHandler(req, res) {
                      try {
                          const { id } = req.params;
                              const vitals = req.body;

                                  if (!id) {
                                        return res.status(400).json({ error: "encounterId required" });
                                            }

                                                const dir = ensureEventFolder(id);
                                                    const filePath = path.join(dir, "vitals.json");

                                                        const existing = readJSON(filePath);

                                                            const entry = {
                                                                  ...vitals,
                                                                        createdAt: new Date().toISOString()
                                                                            };

                                                                                existing.push(entry);

                                                                                    writeJSON(filePath, existing);

                                                                                        res.json(entry);

                                                                                          } catch (err) {
                                                                                              console.error("Vitals error:", err);
                                                                                                  res.status(500).json({ error: "Failed to store vitals" });
                                                                                                    }
                                                                                                    }