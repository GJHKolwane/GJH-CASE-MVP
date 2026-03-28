import fs from "fs";
import path from "path";
import axios from "axios";
import { isOnline } from "../services/dataService.js";

const file = path.resolve("data/encounters.json");

export async function syncOfflineQueue() {
  if (!(await isOnline())) return;

  const data = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file))
    : [];

  const pending = data.filter(e => e._offline);

  if (pending.length === 0) return;

  console.log(`🔄 Syncing ${pending.length} offline records...`);

  for (let record of pending) {
    try {
      await axios.post("http://localhost:5050/db/encounters", record);

      record._offline = false;

    } catch (err) {
      console.error("Sync failed for:", record.id);
    }
  }

  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
