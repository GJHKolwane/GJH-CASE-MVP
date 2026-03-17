import fs from "fs";
import path from "path";

/*
==================================================
HELPERS
==================================================
*/

function ensureDir(encounterId) {
  const dir = path.join("data", "events", encounterId);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
          }

            return dir;
            }

            function read(file) {
              if (!fs.existsSync(file)) return [];

                const raw = fs.readFileSync(file);
                  return JSON.parse(raw);
                  }

                  function write(file, data) {
                    fs.writeFileSync(file, JSON.stringify(data, null, 2));
                    }

                    /*
                    ==================================================
                    CREATE NOTES
                    ==================================================
                    */

                    export async function createNotesHandler(req, res) {
                      try {
                          const { id } = req.params;
                              const { notes } = req.body;

                                  if (!id) {
                                        return res.status(400).json({ error: "encounterId required" });
                                            }

                                                const dir = ensureDir(id);
                                                    const file = path.join(dir, "notes.json");

                                                        const data = read(file);

                                                            const entry = {
                                                                  notes,
                                                                        createdAt: new Date().toISOString()
                                                                            };

                                                                                data.push(entry);

                                                                                    write(file, data);

                                                                                        res.json(entry);

                                                                                          } catch (err) {
                                                                                              console.error("Notes error:", err);

                                                                                                  res.status(500).json({
                                                                                                        error: "Failed to store notes"
                                                                                                            });
                                                                                                              }
                                                                                                              }