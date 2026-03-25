
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
SEARCH BY IDENTIFIER (FHIR STRUCTURE)
====================================================
*/

async function findByIdentifier(identifier: string) {
  const results = await searchPatients({ identifier });
  return results?.[0] || null;
}

/*
====================================================
SEARCH BY DEMOGRAPHICS
====================================================
*/

async function findByDemographics(input: {
  fullName?: string;
  birthDate?: string;
  gender?: string;
}) {
  const patients = await getPatients();

  const name = normalizeName(input.fullName);
  const dob = normalizeDate(input.birthDate);

  return patients.filter((p) => {
    const pName = normalizeName(p.name?.[0]?.text);
    const pDob = normalizeDate(p.birthDate);

    return pName === name && pDob === dob;
  });
}

/*
====================================================
TEMP ID
====================================================
*/

function generateTempId() {
  return `TEMP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/*
====================================================
CORE ENGINE
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
        birthDate
      });

      created.meta = { identityLevel: "verified" };

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
        birthDate
      });

      created.meta = { identityLevel: "probable_match" };

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

    const created = await createPatient({
      identifier: [
        {
          system: "TEMP",
          value: tempId
        }
      ]
    });

    created.meta = { identityLevel: "temporary" };

    return {
      patient: created,
      identityLevel: "temporary"
    };

  } catch (error) {
    console.error("IDENTITY ENGINE ERROR:", error);

    const tempId = generateTempId();

    const fallback = await createPatient({
      identifier: [
        {
          system: "TEMP",
          value: tempId
        }
      ]
    });

    fallback.meta = { identityLevel: "temporary" };

    return {
      patient: fallback,
      identityLevel: "temporary"
    };
  }
        }
