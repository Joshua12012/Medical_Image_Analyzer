import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  sender: { type: String, enum: ["user", "ai"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ chatId: 1, timestamp: 1 });

export default mongoose.model("Message", messageSchema);
