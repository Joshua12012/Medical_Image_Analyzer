import Message from "../models/message.model.js";

export async function addMessage(req, res) {
  try {
    const { chatId } = req.params; // this is Chat._id (ObjectId) when using nested route
    const { sender, text } = req.body;

    if (!chatId) return res.status(400).json({ error: "chatId required" });
    if (!sender || !text)
      return res.status(400).json({ error: "sender and text required" });

    const message = await Message.create({ chatId, sender, text });

    return res.status(201).json(message);
  } catch (err) {
    console.error("addMessage error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

export async function getMessages(req, res) {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatId }).sort({ timestamp: 1 });
    return res.json(messages);
  } catch (err) {
    console.error("getMessages error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
