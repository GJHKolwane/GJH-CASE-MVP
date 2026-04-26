// src/services/patientService.js

import { query } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*
========================================
CREATE PATIENT
========================================
*/
export async function createPatient({ name, national_id, isTemporary }) {
  const id = uuidv4();

  const res = await query(
    `
    INSERT INTO patients (id, name, national_id, status)
    VALUES ($1::uuid, $2, $3, $4)
    RETURNING *;
    `,
    [
      id,
      name || "Unknown",
      national_id || null,
      isTemporary ? "temporary" : "confirmed"
    ]
  );

  return res.rows[0];
}

/*
========================================
FIND PATIENT (MATCH ENGINE - SIMPLE)
========================================
*/
export async function findPatient({ name, national_id }) {
  // 🔥 PRIORITY: national_id (strong match)
  if (national_id) {
    const res = await query(
      `SELECT * FROM patients WHERE national_id = $1 LIMIT 1`,
      [national_id]
    );

    if (res.rows[0]) return res.rows[0];
  }

  // ⚠️ fallback: name (weak match)
  if (name) {
    const res = await query(
      `SELECT * FROM patients WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );

    if (res.rows[0]) return res.rows[0];
  }

  return null;
}

/*
========================================
RESOLVE OR CREATE (MAIN ENTRY POINT)
========================================
*/
export async function resolvePatient(payload) {
  const { name, national_id, isTemporary } = payload;

  // 1️⃣ Try find existing
  const existing = await findPatient({ name, national_id });

  if (existing) {
    return existing;
  }

  // 2️⃣ Create new
  const created = await createPatient({
    name,
    national_id,
    isTemporary
  });

  return created;
}
