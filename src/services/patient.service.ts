import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

/*
====================================================
DATA STORE (CASE-MCP STATE)
====================================================
*/

const DATA_PATH = path.join(process.cwd(), "data", "patients.json");

/*
====================================================
UTILS: LOAD / SAVE (PERSISTENT)
====================================================
*/

function loadPatients(): any[] {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify([]));
  }

  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw || "[]");
}

function savePatients(patients: any[]) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(patients, null, 2));
}

/*
====================================================
NORMALIZATION (CRITICAL FOR MATCHING)
====================================================
*/

function normalizeName(name?: string) {
  if (!name) return null;
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeDate(date?: string) {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
}

/*
====================================================
SEARCH: IDENTIFIER (LEVEL 1)
====================================================
*/

function searchPatientsByIdentifier(identifier: string) {
  const patients = loadPatients();

  return patients.find(
    (p) => p.identifier && p.identifier === identifier
  );
}

/*
====================================================
SEARCH: DEMOGRAPHICS (LEVEL 2)
====================================================
*/

function searchPatientsByDemographics(input: {
  fullName?: string;
  birthDate?: string;
  gender?: string;
}) {
  const patients = loadPatients();

  const name = normalizeName(input.fullName);
  const dob = normalizeDate(input.birthDate);

  return patients.filter((p) => {
    const pName = normalizeName(p.fullName);
    const pDob = normalizeDate(p.birthDate);

    return pName === name && pDob === dob;
  });
}

/*
====================================================
CREATE PATIENT (FHIR-ALIGNED STRUCTURE)
====================================================
*/

function createPatient(data: {
  identifier?: string;
  fullName?: string;
  birthDate?: string;
  gender?: string;
  identityLevel: "verified" | "probable_match" | "temporary";
}) {
  const patients = loadPatients();

  const newPatient = {
    id: uuidv4(),

    // FHIR-ready identifier
    identifier: data.identifier || null,

    // Demographics
    fullName: data.fullName || null,
    birthDate: data.birthDate || null,
    gender: data.gender || null,

    // Meta
    meta: {
      identityLevel: data.identityLevel,
      createdAt: new Date().toISOString(),
      versionId: crypto.randomUUID()
    }
  };

  patients.push(newPatient);
  savePatients(patients);

  return newPatient;
}

/*
====================================================
TEMP ID GENERATION (OFFLINE SAFE)
====================================================
*/

function generateTempId() {
  return `TEMP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/*
====================================================
CORE ENGINE: RESOLVE IDENTITY
====================================================
*/

export async function resolvePatientIdentity(input: {
  identifier?: string;
  fullName?: string;
  birthDate?: string;
  gender?: string;
}) {
  const { identifier, fullName, birthDate, gender } = input;

  try {
    /*
    ========================================
    LEVEL 1 — VERIFIED
    ========================================
    */
    if (identifier) {
      const existing = searchPatientsByIdentifier(identifier);

      if (existing) {
        return {
          patient: existing,
          identityLevel: "verified"
        };
      }

      const created = createPatient({
        identifier,
        fullName,
        birthDate,
        gender,
        identityLevel: "verified"
      });

      return {
        patient: created,
        identityLevel: "verified"
      };
    }

    /*
    ========================================
    LEVEL 2 — PROBABLE MATCH
    ========================================
    */
    if (fullName && birthDate) {
      const matches = searchPatientsByDemographics({
        fullName,
        birthDate,
        gender
      });

      if (matches.length > 0) {
        return {
          patient: matches[0],
          identityLevel: "probable_match"
        };
      }

      const created = createPatient({
        fullName,
        birthDate,
        gender,
        identityLevel: "probable_match"
      });

      return {
        patient: created,
        identityLevel: "probable_match"
      };
    }

    /*
    ========================================
    LEVEL 3 — TEMP
    ========================================
    */
    const tempId = generateTempId();

    const created = createPatient({
      identifier: tempId,
      identityLevel: "temporary"
    });

    return {
      patient: created,
      identityLevel: "temporary"
    };

  } catch (error) {
    console.error("IDENTITY ENGINE FAILURE:", error);

    /*
    🔥 FAILSAFE — NEVER BREAK INTAKE
    */
    const tempId = generateTempId();

    const fallback = createPatient({
      identifier: tempId,
      identityLevel: "temporary"
    });

    return {
      patient: fallback,
      identityLevel: "temporary"
    };
  }
}

/*
====================================================
EXPLICIT TEMP (OPTIONAL)
====================================================
*/

export function createTemporaryPatient() {
  const tempId = generateTempId();

  return createPatient({
    identifier: tempId,
    identityLevel: "temporary"
  });
    }
