import fs from "fs-extra";
import path from "path";

const patientsFile = path.resolve("./data/patients.json");
const encountersFile = path.resolve("./data/encounters.json");

export const readPatients = async () => {
try {
return await fs.readJson(patientsFile);
} catch {
return [];
}
};

export const writePatients = async (data) => {
await fs.writeJson(patientsFile, data, { spaces: 2 });
};

export const readEncounters = async () => {
try {
return await fs.readJson(encountersFile);
} catch {
return [];
}
};

export const writeEncounters = async (data) => {
await fs.writeJson(encountersFile, data, { spaces: 2 });
};