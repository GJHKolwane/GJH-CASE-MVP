// src/services/dbService.js

import { query } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*
================================================
HELPERS
================================================
*/

function isUUID(id) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function ensureObject(data) {
  if (!data || typeof data !== "object") return {};
  return data;
}

/*
================================================
🧼 SANITIZER (STORAGE FIREWALL)
================================================
*/
function sanitizeEncounterData(data) {
  const clean = ensureObject(data);

  if (clean.encounter_data) {
    delete clean.encounter_data.routing;
    delete clean.encounter_data.escalation;

    // 🔒 Protect history structure
    if (!Array.isArray(clean.encounter_data.history)) {
      clean.encounter_data.history = [];
    }
  }

  return clean;
}

/*
================================================
CREATE (ALIGNED WITH GOVERNANCE MODEL)
================================================
*/
export async function createEncounterDB(payload) {
  try {
    const id = payload.id && isUUID(payload.id) ? payload.id : uuidv4();

    const patientId =
      payload.patient_id && isUUID(payload.patient_id)
        ? payload.patient_id
        : uuidv4();

    const initialData = {
      patient: {
        id: patientId,
        name: payload.patient_data?.name || "Unknown Patient",
        national_id: payload.national_id || null
      },

      intake: null,
      vitals: null,
      symptoms: null,

      ai: {},
      decision: {},
      validation: {},

      nurseSession: {},
      doctorSession: {},

      appointment: null,

      history: [
        {
          from: null,
          to: "created",
          actor: "system",
          timestamp: new Date().toISOString()
        }
      ]
    };

    const cleanData = sanitizeEncounterData({ encounter_data: initialData });

    const res = await query(
      `INSERT INTO encounters 
       (id, encounter_data, status)
       VALUES ($1::uuid, $2::jsonb, $3)
       RETURNING *`,
      [id, cleanData.encounter_data, payload.status || "created"]
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
    if (!isUUID(id)) {
      throw new Error("Invalid UUID provided to getEncounterDB");
    }

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
UPDATE (SAFE MERGE + HISTORY ENFORCEMENT)
================================================
*/
export async function updateEncounterDB(id, data, status) {
  try {
    if (!isUUID(id)) {
      throw new Error("Invalid UUID provided to updateEncounterDB");
    }

    const existing = await getEncounterDB(id);

    const existingData = ensureObject(existing.encounter_data);
    const incomingData = ensureObject(data);

    // 🔥 SAFE MERGE (NO OVERWRITE)
    const merged = {
      ...existingData,
      ...incomingData
    };

    // 🔒 HISTORY ENFORCEMENT (APPEND ONLY)
    merged.history = [
      ...(existingData.history || []),
      ...(incomingData.history || [])
    ];

    const cleanData = sanitizeEncounterData({
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
        cleanData.encounter_data,
        status || existing.status || "updated",
        id
      ]
    );

    if (res.rowCount === 0) {
      console.warn("⚠️ UPDATE FAILED: No matching encounter for ID:", id);
      return null;
    }

    const dbRecord = sanitizeEncounterData(res.rows[0]);

    // 🔥 RESPONSE LAYER (NOT STORED IN DB)
    return {
      ...dbRecord,
      routing: incomingData.routing || null,
      escalation: incomingData.escalation || null,
      doctor: incomingData.doctor || null
    };

  } catch (err) {
    console.error("❌ DB UPDATE ERROR:", err);
    throw err;
  }
}

/*
================================================
PATCH FIELD (LIGHTWEIGHT UPDATE)
================================================
*/
export async function patchEncounterField(id, field, value) {
  try {
    if (!isUUID(id)) {
      throw new Error("Invalid UUID provided to patchEncounterField");
    }

    const cleanValue = sanitizeEncounterData(value);

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
        JSON.stringify(cleanValue),
        id
      ]
    );

    if (!res.rows[0]) return null;

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
    if (!isUUID(id)) {
      throw new Error("Invalid UUID provided to deleteEncounterDB");
    }

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
  try {
    const res = await query("SELECT NOW()");
    return res.rows[0];
  } catch (err) {
    console.error("❌ DB CONNECTION ERROR:", err);
    throw err;
  }
      }
