// App.jsx
import { AnimatePresence, motion } from "framer-motion";
import { Send } from "lucide-react";
import { useState } from "react";
import { getAIResponse } from "./api/groq";
import ImageUploader from "./components/ImageUploader";

const createChat = async (userId, title) => {
  return { _id: `chat_${Date.now()}` };
};

const sendMessage = async (chatId, sender, text) => {
  return { sender, text, timestamp: Date.now() };
};

const BACKEND = "http://localhost:5000"; // change if your FastAPI runs on another port

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null); // <--- added file state

  const userId = "abc123";

  // handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // callback passed to the ImageUploader component
  const handleImageUpload = (f) => {
    // f is either a File or null
    if (f) {
      // clear any previous local object URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      // clear
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl(null);
    }
  };

  async function handleSend() {
    const trimmed = input.trim();
    // require either text or image
    if ((!trimmed && !file) || isTyping) return;

    setIsTyping(true);

    // Optimistic user message (shows immediately)
    const userMessage = {
      sender: "user",
      text: trimmed || "[Image]",
      imageUrl: previewUrl || null,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      if (file) {
        // send image+prompt to analyze-image-text endpoint
        const form = new FormData();
        form.append("userId", userId);
        form.append("prompt", trimmed);
        form.append("image", file, file.name);

        const res = await fetch(`${BACKEND}/api/analyze-image-text`, {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const data = await res.json();
        // data expected: { userId, prompt, response, file_meta: { filename, size, url } }
        const serverImageUrl = data.file_meta?.url
          ? `${BACKEND}${data.file_meta.url}`
          : null;

        // Replace optimistic local imageUrl with server image url (if available)
        if (serverImageUrl) {
          setMessages((prev) => {
            const copy = [...prev];
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i].sender === "user" && copy[i].imageUrl) {
                copy[i] = { ...copy[i], imageUrl: serverImageUrl };
                break;
              }
            }
            return copy;
          });
        }

        const aiText = data.response || "No response received";
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: aiText, imageUrl: null },
        ]);
      } else {
        // text-only flow: use getAIResponse (assumed to return text)
        const aiText = await getAIResponse(userId, trimmed);
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: aiText, imageUrl: null },
        ]);
      }

      // cleanup preview and file
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setFile(null);
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Server error. See console.", imageUrl: null },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="min-w-screen flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50">
      <div className="min-w-screen w-full max-w-5xl h-screen flex flex-col font-sans">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 px-6 py-4 border-b border-slate-200/60 bg-white/40 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold">MC</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">
                Medical Assistant
              </h4>
              <p className="text-xs text-slate-500">
                Here to help with your health questions
              </p>
            </div>
          </div>
        </motion.header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 && !isTyping && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl text-white">
                  💬
                </div>
                <h2 className="text-xl font-semibold text-slate-700 mb-2">
                  Start a conversation
                </h2>
                <p className="text-sm text-slate-500">
                  Ask me anything about health and wellness
                </p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className={`flex gap-3 ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-white"
                    style={{
                      background:
                        msg.sender === "user"
                          ? "linear-gradient(90deg,#334155,#0ea5e9)"
                          : "linear-gradient(90deg,#06b6d4,#7c3aed)",
                    }}
                  >
                    {msg.sender === "user" ? "You" : "AI"}
                  </div>

                  <div
                    className={`max-w-[85%] inline-block px-4 py-3 rounded-2xl shadow-sm ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : "bg-white text-slate-800 border border-slate-200/60"
                    }`}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="uploaded"
                        className="max-w-full rounded mb-2"
                      />
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600" />
                <div className="bg-white border border-slate-200/60 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-200" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-400" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 pb-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center">
              {/* Rounded input row containing icon, input and send button */}
              <div className="flex items-center w-full bg-white rounded-2xl border border-slate-300 shadow-lg px-3 py-2">
                {/* Left: icon button (file picker) */}
                <div className="flex items-center">
                  <ImageUploader
                    onFileSelect={handleImageUpload}
                    previewUrl={previewUrl}
                  />
                </div>

                {/* Middle: text input (flex-1 so it takes remaining space) */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  disabled={isTyping}
                  className="flex-1 ml-3 mr-3 py-2 text-black bg-transparent focus:outline-none text-sm"
                />

                {/* Optional: show tiny thumbnail inside the row when preview exists */}
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-10 h-10 rounded-md object-cover mr-3 border"
                  />
                )}

                {/* Right: send button */}
                <button
                  type="submit"
                  className="p-2 rounded-full bg-green-500 hover:bg-green-600 transition"
                >
                  <Send className="w-5 h-5 text-black" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
