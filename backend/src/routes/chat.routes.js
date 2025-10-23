import express from "express";
import { createChat, getChatsByUser } from "../controllers/chat.controller.js";
import messageRouter from "./message.routes.js";

const router = express.Router();
router.post("/", createChat);
router.get("/user/:userId", getChatsByUser);

// mount messages subrouter; :chatId is from this route
router.use("/:chatId/messages", messageRouter);

export default router;
