import cors from "cors";
import express from "express";
import chatRoutes from "./routes/chat.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/test", (req, res) => res.json({ ok: true }));
app.use("/api/chats", chatRoutes);

export default app;
