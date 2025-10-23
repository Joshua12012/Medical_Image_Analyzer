import Chat from "../models/chat.model.js";

export async function createChat(req, res) {
  try {
    const { userId, title } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const chat = await Chat.create({ userId, title });
    return res.status(201).json(chat); // returns { _id, chatId, ... }
  } catch (err) {
    console.error("createChat error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

export async function getChatsByUser(req, res) {
  try {
    const { userId } = req.params;
    const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
    return res.json(chats);
  } catch (err) {
    console.error("getChatsByUser error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
