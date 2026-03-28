import { query } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*
================================================
CREATE
================================================
*/
export async function createEncounterDB() {
  const id = uuidv4();

  const res = await query(
    `INSERT INTO encounters (id, status, encounter_data)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [
      id,
      "created",
      JSON.stringify({
        timeline: [],
        createdAt: new Date().toISOString()
      })
    ]
  );

  return res.rows[0];
}

/*
================================================
GET
================================================
*/
export async function getEncounterDB(id) {
  const res = await query(
    `SELECT * FROM encounters WHERE id = $1`,
    [id]
  );

  return res.rows[0];
}

/*
================================================
UPDATE
================================================
*/
export async function updateEncounterDB(id, data, status) {
  const res = await query(
    `UPDATE encounters
     SET encounter_data = $1,
         status = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [
      JSON.stringify(data),
      status,
      id
    ]
  );

  return res.rows[0];
}
