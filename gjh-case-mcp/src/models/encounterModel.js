import { v4 as uuidv4 } from "uuid";
import { readEncounters, writeEncounters } from "../database/db.js";

export const createEncounter = async (data) => {

const encounters = await readEncounters();

const encounter = {
resourceType: "Encounter",
id: uuidv4(),

status: "in-progress",

subject: {
  reference: "Patient/" + data.patientId
  },

  vitals: {
    temperature: "",
      bloodPressure: "",
        heartRate: "",
          respiratoryRate: "",
            oxygenSaturation: ""
            },

            symptoms: [],

            notes: "",

            soan: {
              subjective: "",
                objective: "",
                  assessment: "",
                    nextSteps: ""
                    },

                    triage: {
                      riskLevel: "",
                        aiRecommendation: ""
                        },

                        escalation: {
                          required: false,
                            doctorId: null
                            },

                            prescription: [],

                            createdAt: new Date()

                            };

                            encounters.push(encounter);

                            await writeEncounters(encounters);

                            return encounter;
                            };

                            export const getEncounters = async () => {
                            return await readEncounters();
                            };

                            export const getEncounterById = async (id) => {

                            const encounters = await readEncounters();

                            return encounters.find(e => e.id === id);
                            };

                            export const updateEncounter = async (id, updates) => {

                            const encounters = await readEncounters();

                            const index = encounters.findIndex(e => e.id === id);

                            if (index === -1) return null;

                            encounters[index] = {
                            ...encounters[index],
                            ...updates
                            };

                            await writeEncounters(encounters);

                            return encounters[index];
                            };