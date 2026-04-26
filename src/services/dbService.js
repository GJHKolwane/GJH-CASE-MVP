// src/services/dbService.js

import { query } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*
================================================
HELPERS
================================================
*/

function isUUID(id) {
  if (!id || typeof id !== "string") return false;

  const clean = id.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean);
}

function ensureObject(data) {
  if (!data || typeof data !== "object") return {};
  return data;
}

/*
================================================
🧼 SANITIZER (STRICT + SAFE)
================================================
*/
function sanitizeEncounterData(data) {
  const clean = ensureObject(data);

  // ❌ Remove root-level history
  if (clean.history) {
    delete clean.history;
  }

  // 🔥 Prevent nested encounter_data
  if (clean.encounter_data?.encounter_data) {
    clean.encounter_data = clean.encounter_data.encounter_data;
  }

  // ✅ Ensure encounter_data exists
  if (!clean.encounter_data || typeof clean.encounter_data !== "object") {
    clean.encounter_data = {};
  }

  // ✅ Ensure history ONLY inside encounter_data
  if (!Array.isArray(clean.encounter_data.history)) {
    clean.encounter_data.history = [];
  }

  return clean;
}

/*
================================================
CREATE (STRICT + STAGE-ALIGNED)
================================================
*/
export async function createEncounterDB(payload) {
  try {
    const id = isUUID(payload.id) ? payload.id.trim() : uuidv4();

    // 🔥 STRICT: patient_id must come from PatientService
    if (!payload.patient_id || !isUUID(payload.patient_id)) {
      throw new Error("Valid patient_id required");
    }

    const patientId = payload.patient_id.trim();

    const name =
      payload.name ||
      payload.patient_data?.name ||
      "Unknown Patient";

    const nationalId =
      payload.national_id ||
      payload.patient_data?.national_id ||
      null;

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
    id = id?.trim();

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
UPDATE (STAGE MERGE ONLY)
================================================
*/
export async function updateEncounterDB(id, incomingData, newStatus) {
  try {
    id = id?.trim();

    if (!isUUID(id)) throw new Error("Invalid UUID");

    const existing = await getEncounterDB(id);

    const existingData = ensureObject(existing.encounter_data);

    // 🔥 ONLY accept encounter_data payload
    const incoming = ensureObject(
      incomingData.encounter_data || incomingData
    );

    // 🔥 STAGE MERGE
    const merged = {
      ...existingData,
      ...incoming
    };

    // 🔒 HISTORY = append only
    merged.history = [
      ...(existingData.history || []),
      ...(incoming.history || [])
    ];

    const clean = sanitizeEncounterData({
      encounter_data: merged
    });

    const res = await query(
      `UPDATE encounters 
       SET encounter_data = $1::jsonb,
           status = $2,
           updated_at = NOW()
       WHERE id = $3::uuid
       RETURNING *`,
      [
        clean.encounter_data,
        newStatus || existing.status,
        id
      ]
    );

    if (!res.rows[0]) {
      throw new Error("Update failed");
    }

    return sanitizeEncounterData(res.rows[0]);

  } catch (err) {
    console.error("❌ DB UPDATE ERROR:", err);
    throw err;
  }
}

/*
================================================
PATCH (OPTIONAL)
================================================
*/
export async function patchEncounterField(id, field, value) {
  try {
    id = id?.trim();

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

    if (!res.rows[0]) {
      throw new Error("Patch failed");
    }

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
    id = id?.trim();

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
