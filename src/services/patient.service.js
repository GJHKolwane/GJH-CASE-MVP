import {
createPatient,
searchPatients,
getPatients
} from "../models/patientModel.js";

/*

NORMALIZATION

*/

function normalizeName(name) {
if (!name) return null;
return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeDate(date) {
if (!date) return null;
return new Date(date).toISOString().split("T")[0];
}

function normalizeIdentifier(id) {
if (!id) return null;
return id.toString().trim();
}

/*

SEARCH BY IDENTIFIER (FHIR STRUCTURE)

*/

async function findByIdentifier(identifier) {
const normalized = normalizeIdentifier(identifier);

if (!normalized) return null;

const results = await searchPatients({ identifier: normalized });

return results?.[0] || null;
}

/*

SEARCH BY DEMOGRAPHICS

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

TEMP ID GENERATION

*/

function generateTempId() {
return "TEMP-${Date.now()}-${Math.floor(Math.random() * 100000)}";
}

/*

CORE ENGINE: RESOLVE PATIENT IDENTITY

*/

export async function resolvePatientIdentity(input) {
const { identifier, fullName, birthDate, gender } = input;

try {

/*
====================================================
VALIDATION LAYER
====================================================
*/

if (identifier && !fullName) {
  throw new Error("Full name is required when identifier is provided");
}

if (!identifier && fullName && !birthDate) {
  throw new Error("Birth date required for demographic matching");
}

/*
====================================================
LEVEL 1 — VERIFIED (IDENTIFIER)
====================================================
*/

if (identifier) {
  const existing = await findByIdentifier(identifier);

  if (existing) {
    console.log("✅ EXISTING PATIENT FOUND:", existing.id);

    return {
      patient: existing,
      identityLevel: "verified"
    };
  }

  console.log("⚠️ NO MATCH — CREATING VERIFIED PATIENT");

  const created = await createPatient({
    identifier: [
      {
        system: "GJH",
        value: normalizeIdentifier(identifier)
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
====================================================
LEVEL 2 — PROBABLE MATCH (DEMOGRAPHICS)
====================================================
*/

if (fullName && birthDate) {
  const matches = await findByDemographics({
    fullName,
    birthDate,
    gender
  });

  if (matches.length > 0) {
    console.log("🟡 PROBABLE MATCH FOUND:", matches[0].id);

    return {
      patient: matches[0],
      identityLevel: "probable_match"
    };
  }

  console.log("⚠️ NO DEMOGRAPHIC MATCH — CREATING PROBABLE PATIENT");

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
====================================================
LEVEL 3 — TEMPORARY (EMERGENCY)
====================================================
*/

console.warn("⚠️ NO IDENTITY DATA — CREATING TEMP PATIENT");

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

/*
====================================================
HARD FAILURE — DO NOT SILENTLY MASK
====================================================
*/

console.error("❌ IDENTITY ENGINE FAILURE:", {
  message: error.message,
  stack: error.stack,
  input
});

throw new Error("Patient identity resolution failed");

}
}
