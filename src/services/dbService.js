// src/services/dbService.js

import { query } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*
================================================
HELPERS
================================================
*/

function isUUID(id) {
  return /^[0-9a-f-]{36}$/i.test(id);
}

function ensureObject(data) {
  return data && typeof data === "object" ? data : {};
}

/*
================================================
🧼 SANITIZER (MINIMAL + SAFE)
================================================
*/
function sanitizeEncounterData(data) {
  const clean = ensureObject(data);

  // ensure history always exists
  if (!Array.isArray(clean.history)) {
    clean.history = [];
  }

  return clean;
}

/*
================================================
CREATE (LEAN + STAGE-READY)
================================================
*/
export async function createEncounterDB(payload) {
  try {
    const id = isUUID(payload.id) ? payload.id : uuidv4();
    const patientId = isUUID(payload.patient_id)
      ? payload.patient_id
      : uuidv4();

    const name =
      payload.name ||
      payload.patient_data?.name ||
      "Unknown Patient";

    const nationalId =
      payload.national_id ||
      payload.patient_data?.national_id ||
      null;

    // ✅ ONLY WHAT EXISTS NOW
    const encounter_data = sanitizeEncounterData({
      patient: {
        id: patientId,
        name,
        national_id: nationalId
      },
      history: [
        {
          from: null,
          to: "created",
          actor: "system",
          timestamp: new Date().toISOString()
        }
      ]
    });

    const res = await query(
      `INSERT INTO encounters 
       (id, encounter_data, status, patient_id, owner_type, owner_id)
       VALUES ($1::uuid, $2::jsonb, $3, $4::uuid, $5, $6)
       RETURNING *`,
      [
        id,
        encounter_data,
        "created",
        patientId,
        "system",
        null
      ]
    );

    return sanitizeEncounterData(res.rows[0]);

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
    if (!isUUID(id)) throw new Error("Invalid UUID");

    const res = await query(
      `SELECT * FROM encounters WHERE id = $1::uuid`,
      [id]
    );

    if (!res.rows[0]) {
      throw new Error("Encounter not found");
    }

    return sanitizeEncounterData(res.rows[0]);

  } catch (err) {
    console.error("❌ DB GET ERROR:", err);
    throw err;
  }
}

/*
================================================
UPDATE (STAGE MERGE ENGINE)
================================================
*/
export async function updateEncounterDB(id, incomingData, newStatus) {
  try {
    if (!isUUID(id)) throw new Error("Invalid UUID");

    const existing = await getEncounterDB(id);

    const existingData = ensureObject(existing.encounter_data);
    const incoming = ensureObject(incomingData);

    // 🔥 CORE MERGE RULE
    const merged = {
      ...existingData,
      ...incoming
    };

    // 🔒 HISTORY = append only
    merged.history = [
      ...(existingData.history || []),
      ...(incoming.history || [])
    ];

    const clean = sanitizeEncounterData(merged);

    const res = await query(
      `UPDATE encounters 
       SET encounter_data = $1::jsonb,
           status = $2,
           updated_at = NOW()
       WHERE id = $3::uuid
       RETURNING *`,
      [
        clean,
        newStatus || existing.status,
        id
      ]
    );

    return sanitizeEncounterData(res.rows[0]);

  } catch (err) {
    console.error("❌ DB UPDATE ERROR:", err);
    throw err;
  }
}

/*
================================================
PATCH (OPTIONAL - KEEP SIMPLE)
================================================
*/
export async function patchEncounterField(id, field, value) {
  try {
    if (!isUUID(id)) throw new Error("Invalid UUID");

    const res = await query(
      `
      UPDATE encounters
      SET encounter_data = jsonb_set(
        encounter_data,
        $1,
        $2::jsonb,
        true
      ),
      updated_at = NOW()
      WHERE id = $3::uuid
      RETURNING *;
      `,
      [
        `{${field}}`,
        JSON.stringify(value),
        id
      ]
    );

    return sanitizeEncounterData(res.rows[0]);

  } catch (err) {
    console.error("❌ DB PATCH ERROR:", err);
    throw err;
  }
}

/*
================================================
DELETE
================================================
*/
export async function deleteEncounterDB(id) {
  try {
    if (!isUUID(id)) throw new Error("Invalid UUID");

    const res = await query(
      `DELETE FROM encounters WHERE id = $1::uuid RETURNING *`,
      [id]
    );

    return res.rows[0] || null;

  } catch (err) {
    console.error("❌ DB DELETE ERROR:", err);
    throw err;
  }
}

/*
================================================
HEALTH CHECK
================================================
*/
export async function checkDBConnection() {
  return await query("SELECT NOW()");
}
