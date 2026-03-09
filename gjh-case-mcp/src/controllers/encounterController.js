import {
    createEncounter,
    getEncounters,
    getEncounterById,
    updateEncounter
    } from "../models/encounterModel.js";

    export const createEncounterHandler = async (req, res) => {

    const encounter = await createEncounter(req.body);

    res.json(encounter);

    };

    export const getEncountersHandler = async (req, res) => {

    const encounters = await getEncounters();

    res.json(encounters);

    };

    export const getEncounterHandler = async (req, res) => {

    const encounter = await getEncounterById(req.params.id);

    if (!encounter) {
    return res.status(404).json({ error: "Encounter not found" });
    }

    res.json(encounter);

    };

    export const updateEncounterHandler = async (req, res) => {

    const encounter = await updateEncounter(req.params.id, req.body);

    if (!encounter) {
    return res.status(404).json({ error: "Encounter not found" });
    }

    res.json(encounter);

    };
