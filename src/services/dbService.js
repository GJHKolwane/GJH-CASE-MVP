import { query } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*

CREATE

*/
export async function createEncounterDB(patientId, nationalId) {
const id = uuidv4();

const initialData = {
timeline: [],
createdAt: new Date().toISOString()
};

const res = await query(
"INSERT INTO encounters  (id, patient_id, national_id, status, encounter_data) VALUES ($1, $2, $3, $4, $5) RETURNING *",
[
id,
patientId,
nationalId,
"created",
JSON.stringify(initialData)
]
);

return res.rows[0];
}

/*

GET

*/
export async function getEncounterDB(id) {
const res = await query(
"SELECT * FROM encounters WHERE id = $1",
[id]
);

return res.rows[0];
}

/*

UPDATE

*/
export async function updateEncounterDB(id, data, status) {
const res = await query(
"UPDATE encounters SET encounter_data = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
[
JSON.stringify(data),
status,
id
]
);

return res.rows[0];
}
