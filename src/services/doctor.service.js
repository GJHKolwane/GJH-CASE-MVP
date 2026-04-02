// src/services/doctor.service.js

/**
 * Mock doctor pool (Phase 1)
 * Later → DB / availability service
 */
const doctors = [
  { id: "doc-001", name: "Dr Seleka", specialty: "General" },
  { id: "doc-002", name: "Dr Molefe", specialty: "Emergency" }
];


/**
 * Assign doctor to escalated case
 */
export function assignDoctor({ escalation, caseId }) {

  if (!escalation?.status) {
    return null;
  }

  // 🔥 SIMPLE STRATEGY (Phase 1)
  const selectedDoctor = doctors[0];

  return {
    id: selectedDoctor.id,
    name: selectedDoctor.name,
    specialty: selectedDoctor.specialty,
    assignedAt: new Date().toISOString(),
    status: "assigned",
    caseId
  };
}
