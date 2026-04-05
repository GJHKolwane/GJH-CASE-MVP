import { query } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*
================================================
CREATE
================================================
*/
export async function createEncounterDB(payload) {
  try {
    // 🔥 Ensure IDs exist (fallback safety)
    const id = payload.id || uuidv4();
    const patientId = payload.patient_id || uuidv4();

    const initialData = payload.encounter_data || {
      timeline: [
        {
          event: "🆕 Encounter created",
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await query(
      `INSERT INTO encounters 
       (id, patient_id, national_id, status, encounter_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        patientId,
        payload.national_id || null,
        payload.status || "CREATED",
        initialData // ✅ NO JSON.stringify (pg handles JSONB)
      ]
    );

    return res.rows[0];

  } catch (err) {
    console.error("❌ DB CREATE ERROR:", err);
    throw err;
  }
}

/*
================================================
GET
================================================
*/
export async function getEncounterDB(id) {
  try {
    const res = await query(
      "SELECT * FROM encounters WHERE id = $1",
      [id]
    );

    return res.rows[0];

  } catch (err) {
    console.error("❌ DB GET ERROR:", err);
    throw err;
  }
}

/*
================================================
UPDATE
================================================
*/
export async function updateEncounterDB(id, data, status) {
  try {
    const res = await query(
      `UPDATE encounters 
       SET encounter_data = $1, status = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [
        data,                     // ✅ NO JSON.stringify
        status || "UPDATED",
        id
      ]
    );

    return res.rows[0];

  } catch (err) {
    console.error("❌ DB UPDATE ERROR:", err);
    throw err;
  }
}
