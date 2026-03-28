import fs from "fs";
import path from "path";
import axios from "axios";

const file = path.resolve("data/encounters.json");

/*
========================================
HELPERS
========================================
*/

const readFile = () =>
  fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file))
    : [];

const writeFile = (data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

/*
========================================
ONLINE CHECK
========================================
*/

export async function isOnline() {
  try {
    await axios.get("http://localhost:5050/health"); // or DB ping
    return true;
  } catch {
    return false;
  }
}

/*
========================================
CREATE
========================================
*/

export async function createEncounterData(encounter) {
  if (await isOnline()) {
    // 👉 DB WRITE
    const res = await axios.post("http://localhost:5050/db/encounters", encounter);
    return res.data;
  } else {
    // 👉 FILE WRITE
    const data = readFile();
    data.push({ ...encounter, _offline: true });
    writeFile(data);
    return encounter;
  }
}

/*
========================================
GET
========================================
*/

export async function getEncounterData(id) {
  if (await isOnline()) {
    const res = await axios.get(`http://localhost:5050/db/encounters/${id}`);
    return res.data;
  } else {
    const data = readFile();
    return data.find(e => e.id === id);
  }
}

/*
========================================
UPDATE
========================================
*/

export async function updateEncounterData(id, updates) {
  if (await isOnline()) {
    const res = await axios.put(
      `http://localhost:5050/db/encounters/${id}`,
      updates
    );
    return res.data;
  } else {
    const data = readFile();
    const index = data.findIndex(e => e.id === id);

    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...updates,
        _offline: true
      };
      writeFile(data);
    }

    return data[index];
  }
}
