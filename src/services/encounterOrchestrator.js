import { normalizeIntake } from "../../gjh-contracts/normalizers/normalizeIntake.js";
import { normalizeVitals } from "../../gjh-contracts/normalizers/normalizeVitals.js";
import { standardizeDecision } from "../../gjh-contracts/normalizers/standardizeDecision.js";

import { IntakeSchema } from "../../gjh-contracts/validators/intake.validator.js";
import { VitalsSchema } from "../../gjh-contracts/validators/vitals.validator.js";
import { DecisionSchema } from "../../gjh-contracts/validators/decision.validator.js";

export async function processEncounter(payload, runAI) {
  // STEP 1: Normalize
    const intake = normalizeIntake(payload.intake);
      const vitals = normalizeVitals(payload.vitals);

        // STEP 2: Validate
          IntakeSchema.parse(intake);
            VitalsSchema.parse(vitals);

              // STEP 3: AI + RULE ENGINE
                const aiDecision = await runAI(intake, vitals);

                  // STEP 4: Standardize
                    const decision = standardizeDecision(aiDecision);

                      // STEP 5: Validate decision
                        DecisionSchema.parse(decision);

                          return {
                              intake,
                                  vitals,
                                      decision,
                                        };
                                        }