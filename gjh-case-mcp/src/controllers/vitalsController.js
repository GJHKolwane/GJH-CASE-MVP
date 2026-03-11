import { generateId } from "../utils/idGenerator.js";
import { appendEvent } from "../services/eventStore.js";

export async function recordVitalsHandler(req, res) {

  const { id } = req.params;

    const event = {
        id: generateId("vitals"),
            encounterId: id,
                ...req.body,
                    recordedAt: new Date().toISOString()
                      };

                        await appendEvent(id, "vitals", event);

                          res.status(201).json(event);

                          }