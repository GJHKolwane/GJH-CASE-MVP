import { generateId } from "../utils/idGenerator.js";
import { getDB } from "../database/db.js";

export async function recordNotesHandler(req, res) {

  const { id } = req.params;
    const { text, author } = req.body;

      const db = await getDB();

        const event = {
            id: generateId("note"),
                encounterId: id,
                    text,
                        author,
                            timestamp: new Date().toISOString()
                              };

                                db.notes.push(event);

                                  await db.write();

                                    res.status(201).json(event);

                                    }