import { v4 as uuidv4 } from "uuid";
import { readPatients, writePatients } from "../database/db.js";

export const createPatient = async (data) => {

const patients = await readPatients();

const patient = {
resourceType: "Patient",
id: uuidv4(),
name: data.name,
gender: data.gender,
birthDate: data.birthDate,
telecom: data.telecom || [],
address: data.address || [],
createdAt: new Date()
};

patients.push(patient);

await writePatients(patients);

return patient;
};

export const getPatients = async () => {
return await readPatients();
};

export const getPatientById = async (id) => {

const patients = await readPatients();

return patients.find(p => p.id === id);

};