import crypto from "crypto";
import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    chatId: { type: String, unique: true, index: true, required: true },
    userId: { type: String, required: true }, // use ObjectId if you prefer
    title: { type: String, default: "New Chat" },
    lastMessage: { type: String },
    messageCount: { type: Number, default: 0 },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

chatSchema.pre("validate", function (next) {
  if (!this.chatId) this.chatId = crypto.randomBytes(12).toString("hex");
  next();
});

// text index for searchable UI fields
chatSchema.index({ title: "text", lastMessage: "text" });

export default mongoose.model("Chat", chatSchema);
