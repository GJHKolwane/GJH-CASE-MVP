import fs from "fs/promises";
import path from "path";

const EVENTS_ROOT = "./data/events";

async function ensureEncounterFolder(encounterId) {
  const folder = path.join(EVENTS_ROOT, encounterId);

    await fs.mkdir(folder, { recursive: true });

      return folder;
      }

      export async function appendEvent(encounterId, type, payload) {

        const folder = await ensureEncounterFolder(encounterId);

          const file = path.join(folder, `${type}.json`);

            let events = [];

              try {
                  const raw = await fs.readFile(file);
                      events = JSON.parse(raw);
                        } catch {
                            events = [];
                              }

                                events.push(payload);

                                  await fs.writeFile(file, JSON.stringify(events, null, 2));

                                  }