// In-memory encounter store (temporary DB)
const encounters = new Map();

/*
========================================
CREATE ENCOUNTER
========================================
*/
export function createEncounter(patientId) {
  const id = `enc-${Date.now()}`;

  const encounter = {
    id,
    patientId,
    status: "active",
    timeline: [],
    vitals: null,
    symptoms: null,
    triage: null,
    notes: [],
    labs: [],
    createdAt: new Date().toISOString()
  };

  encounters.set(id, encounter);
  return encounter;
}

/*
========================================
GET ENCOUNTER
========================================
*/
export function getEncounter(id) {
  return encounters.get(id);
}

/*
========================================
SAVE ENCOUNTER
========================================
*/
export function saveEncounter(encounter) {
  encounters.set(encounter.id, encounter);
  return encounter;
}
