import express from "express";
const router = express.Router();
import {
  orderLabHandler,
  recordLabResultHandler
} from "../controllers/labController.js";

const router = express.Router();

router.post("/:id/order", orderLabHandler);

router.post("/:id/result", recordLabResultHandler);

export default router;
