import fs from "fs";
import path from "path";

function ensureDir(encounterId) {
  const dir = path.join("data", "events", encounterId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return dir;
      }

      function read(file) {
        if (!fs.existsSync(file)) return [];
          return JSON.parse(fs.readFileSync(file));
          }

          function write(file, data) {
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
            }



            export async function createSymptomsHandler(req, res) {
              try {
                  const { id } = req.params;
                      const symptoms = req.body;

                          const dir = ensureDir(id);
                              const file = path.join(dir, "symptoms.json");

                                  const data = read(file);

                                      const entry = {
                                            symptoms,
                                                  createdAt: new Date().toISOString()
                                                      };

                                                          data.push(entry);
                                                              write(file, data);

                                                                  res.json(entry);
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                            res.status(500).json({ error: "Failed to store symptoms" });
                                                                              }
                                                                              }