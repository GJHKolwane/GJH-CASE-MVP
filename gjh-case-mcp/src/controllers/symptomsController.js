import { generateId } from "../utils/idGenerator.js";
import { getDB } from "../database/db.js";

export async function recordSymptomsHandler(req, res) {

  const { id } = req.params;
    const symptoms = req.body;

      const db = await getDB();

        const event = {
            id: generateId("symptom"),
                encounterId: id,
                    ...symptoms,
                        timestamp: new Date().toISOString()
                          };

                            db.symptoms.push(event);

                              await db.write();

                                res.status(201).json(event);

                                }