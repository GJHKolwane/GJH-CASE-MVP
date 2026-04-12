// src/services/dbService.js

import { query } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*
================================================
HELPERS
================================================
*/

// Validate UUID format
function isUUID(id) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Ensure JSON object
function ensureObject(data) {
  if (!data || typeof data !== "object") return {};
  return data;
}

/*
================================================
🧼 CORE SANITIZER (DB FIREWALL)
================================================
*/
function sanitizeEncounterData(data) {
  const clean = ensureObject(data);

  // 🔥 HARD DELETE — NEVER STORE THESE
  if (clean.encounter_data) {
    delete clean.encounter_data.routing;
    delete clean.encounter_data.escalation;
  }

  // 🔥 ALSO CLEAN ROOT (DEFENSIVE)
  delete clean.routing;
  delete clean.escalation;

  return clean;
}

/*
================================================
CREATE
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
      vitals: null,
      symptoms: null,
      notes: null,
      triage: null,
      timeline: [
        {
          event: "🆕 Encounter created",
          timestamp: new Date().toISOString()
        }
      ]
    };

    const cleanData = sanitizeEncounterData(initialData);

    const res = await query(
      `INSERT INTO encounters 
       (id, encounter_data, status)
       VALUES ($1::uuid, $2::jsonb, $3)
       RETURNING *`,
      [id, cleanData, payload.status || "created"]
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

    if (!res.rows[0]) return null;

    // 🔥 DEFENSIVE CLEAN ON READ
    return sanitizeEncounterData(res.rows[0]);

  } catch (err) {
    console.error("❌ DB GET ERROR:", err);
    throw err;
  }
}

/*
================================================
UPDATE (CRITICAL FIX)
================================================
*/
export async function updateEncounterDB(id, data, status) {
  try {
    if (!isUUID(id)) {
      throw new Error("Invalid UUID provided to updateEncounterDB");
    }

    const safeData = ensureObject(data);

    // 🔥🔥🔥 CRITICAL: SANITIZE BEFORE SAVE
    const cleanData = sanitizeEncounterData(safeData);

    const res = await query(
      `UPDATE encounters 
       SET encounter_data = $1::jsonb,
           status = $2,
           updated_at = NOW()
       WHERE id = $3::uuid
       RETURNING *`,
      [
        cleanData,
        status || "updated",
        id
      ]
    );

    if (res.rowCount === 0) {
      console.warn("⚠️ UPDATE FAILED: No matching encounter for ID:", id);
      return null;
    }

    // 🔥 DEFENSIVE CLEAN ON RETURN
    return sanitizeEncounterData(res.rows[0]);

  } catch (err) {
    console.error("❌ DB UPDATE ERROR:", err);
    throw err;
  }
}

/*
================================================
PATCH FIELD (SAFE)
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
