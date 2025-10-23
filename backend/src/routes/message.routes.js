import express from "express";
import { addMessage, getMessages } from "../controllers/message.controller.js";

const router = express.Router({ mergeParams: true }); // IMPORTANT so req.params.chatId works
router.post("/", addMessage);
router.get("/", getMessages);

export default router;
