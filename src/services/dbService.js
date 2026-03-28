import { pool } from "../config/db.js";

/*
CREATE
*/
export async function createEncounterDB(encounter) {
  const query = `
    INSERT INTO encounters (id, data)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const values = [encounter.id, encounter];

  const res = await pool.query(query, values);
  return res.rows[0];
}

/*
GET
*/
export async function getEncounterDB(id) {
  const res = await pool.query(
    "SELECT data FROM encounters WHERE id = $1",
    [id]
  );

  return res.rows[0]?.data;
}

/*
UPDATE
*/
export async function updateEncounterDB(id, data) {
  const res = await pool.query(
    "UPDATE encounters SET data = $1 WHERE id = $2 RETURNING *",
    [data, id]
  );

  return res.rows[0];
}
