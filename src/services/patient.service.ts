import {
  createPatient,
  searchPatients,
  getPatients
} from "../models/patientModel.js";

/*
====================================================
NORMALIZATION
====================================================
*/

function normalizeName(name) {
  if (!name) return null;
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeDate(date) {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
}

/*
====================================================
SEARCH BY IDENTIFIER (FHIR STRUCTURE)
====================================================
*/

async function findByIdentifier(identifier) {
  const results = await searchPatients({ identifier });
  return results?.[0] || null;
}

/*
====================================================
SEARCH BY DEMOGRAPHICS
====================================================
*/

async function findByDemographics({ fullName, birthDate, gender }) {
  const patients = await getPatients();

  const name = normalizeName(fullName);
  const dob = normalizeDate(birthDate);

  return patients.filter((p) => {
    const pName = normalizeName(p.name?.[0]?.text);
    const pDob = normalizeDate(p.birthDate);

    return pName === name && pDob === dob;
  });
}

/*
====================================================
TEMP ID GENERATION
====================================================
*/

function generateTempId() {
  return `TEMP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/*
====================================================
CORE ENGINE: RESOLVE PATIENT IDENTITY
====================================================
*/

export async function resolvePatientIdentity(input) {
  const { identifier, fullName, birthDate, gender } = input;

  try {
    /*
    ========================================
    LEVEL 1 — VERIFIED
    ========================================
    */
    if (identifier) {
      const existing = await findByIdentifier(identifier);

      if (existing) {
        return {
          patient: existing,
          identityLevel: "verified"
        };
      }

      const created = await createPatient({
        identifier: [
          {
            system: "GJH",
            value: identifier
          }
        ],
        fullName,
        gender,
        birthDate,
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
      const matches = await findByDemographics({
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

      const created = await createPatient({
        fullName,
        gender,
        birthDate,
        identityLevel: "probable_match"
      });

      return {
        patient: created,
        identityLevel: "probable_match"
      };
    }

    /*
    ========================================
    LEVEL 3 — TEMPORARY
    ========================================
    */
    const tempId = generateTempId();

    const created = await createPatient({
      identifier: [
        {
          system: "TEMP",
          value: tempId
        }
      ],
      identityLevel: "temporary"
    });

    return {
      patient: created,
      identityLevel: "temporary"
    };

  } catch (error) {
    console.error("IDENTITY ENGINE ERROR:", error);

    /*
    🔥 FAILSAFE — NEVER BREAK INTAKE
    */
    const tempId = generateTempId();

    const fallback = await createPatient({
      identifier: [
        {
          system: "TEMP",
          value: tempId
        }
      ],
      identityLevel: "temporary"
    });

    return {
      patient: fallback,
      identityLevel: "temporary"
    };
  }
        }
