// src/controllers/queryController.js

import { getSOANView } from "../services/queries/soan.query.js";
import { getDoctorQueue } from "../services/queries/doctor.queue.js";
import { getNurseQueue } from "../services/queries/nurse.queue.js";
import { getEncounterHistory } from "../services/queries/history.query.js";

/*
================================================
🧾 SOAN VIEW (DOCTOR SCREEN)
================================================
*/
export const getSOAN = async (req, res) => {
  try {
      const { id } = req.params;

          const data = await getSOANView(id);

              return res.status(200).json({
                    success: true,
                          data
                              });

                                } catch (err) {
                                    console.error("❌ SOAN ERROR:", err);
                                        return res.status(500).json({
                                              success: false,
                                                    message: err.message
                                                        });
                                                          }
                                                          };

                                                          /*
                                                          ================================================
                                                          👨‍⚕️ DOCTOR QUEUE
                                                          ================================================
                                                          */
                                                          export const doctorQueue = async (req, res) => {
                                                            try {
                                                                const data = await getDoctorQueue();

                                                                    return res.status(200).json({
                                                                          success: true,
                                                                                count: data.length,
                                                                                      data
                                                                                          });

                                                                                            } catch (err) {
                                                                                                console.error("❌ DOCTOR QUEUE ERROR:", err);
                                                                                                    return res.status(500).json({
                                                                                                          success: false,
                                                                                                                message: err.message
                                                                                                                    });
                                                                                                                      }
                                                                                                                      };

                                                                                                                      /*
                                                                                                                      ================================================
                                                                                                                      🧑‍⚕️ NURSE QUEUE
                                                                                                                      ================================================
                                                                                                                      */
                                                                                                                      export const nurseQueue = async (req, res) => {
                                                                                                                        try {
                                                                                                                            const data = await getNurseQueue();

                                                                                                                                return res.status(200).json({
                                                                                                                                      success: true,
                                                                                                                                            count: data.length,
                                                                                                                                                  data
                                                                                                                                                      });

                                                                                                                                                        } catch (err) {
                                                                                                                                                            console.error("❌ NURSE QUEUE ERROR:", err);
                                                                                                                                                                return res.status(500).json({
                                                                                                                                                                      success: false,
                                                                                                                                                                            message: err.message
                                                                                                                                                                                });
                                                                                                                                                                                  }
                                                                                                                                                                                  };

                                                                                                                                                                                  /*
                                                                                                                                                                                  ================================================
                                                                                                                                                                                  🧾 HISTORY (AUDIT TRAIL)
                                                                                                                                                                                  ================================================
                                                                                                                                                                                  */
                                                                                                                                                                                  export const getHistory = async (req, res) => {
                                                                                                                                                                                    try {
                                                                                                                                                                                        const { id } = req.params;

                                                                                                                                                                                            const data = await getEncounterHistory(id);

                                                                                                                                                                                                return res.status(200).json({
                                                                                                                                                                                                      success: true,
                                                                                                                                                                                                            count: data.length,
                                                                                                                                                                                                                  data
                                                                                                                                                                                                                      });

                                                                                                                                                                                                                        } catch (err) {
                                                                                                                                                                                                                            console.error("❌ HISTORY ERROR:", err);
                                                                                                                                                                                                                                return res.status(500).json({
                                                                                                                                                                                                                                      success: false,
                                                                                                                                                                                                                                            message: err.message
                                                                                                                                                                                                                                                });
                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                  };