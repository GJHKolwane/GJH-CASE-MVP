import {
    createPatient,
    getPatients,
    getPatientById
    } from "../models/patientModel.js";

    export const createPatientHandler = async (req, res) => {

    const patient = await createPatient(req.body);

    res.json(patient);

    };

    export const getPatientsHandler = async (req, res) => {

    const patients = await getPatients();

    res.json(patients);

    };

    export const getPatientHandler = async (req, res) => {

    const patient = await getPatientById(req.params.id);

    if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
    }

    res.json(patient);

    };
