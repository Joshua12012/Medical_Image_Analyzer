// App.jsx
import { AnimatePresence, motion } from "framer-motion";
import "highlight.js/styles/github.css";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { fetchUserChats } from "./api/chats";
import ImageUploader from "./components/ImageUploader";
import Sidebar from "./components/Sidebar";

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
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);


  // load chats once on mount
  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    try {
      const data = await fetchUserChats(userId); // { chats: [...] }
      setChats(data.chats || []);
      // optionally auto-open most recent chat:
      if ((data.chats || []).length && !currentChatId) {
        setCurrentChatId(data.chats[0].chat_id);
        // optionally fetch messages for that chat here (next step)
      }
    } catch (err) {
      console.error("loadChats error:", err);
      // keep UI tolerant (show empty list)
    }
  }
  // call when user clicks on new chat
  async function handleNewChat() {
    try {
      const res = await fetch("http://localhost:5000/api/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      // Reset state BEFORE any message gets sent
      setCurrentChatId(data.chat_id); // ensure next messages go to this chat
      setMessages([]);
      setChats((prev) => [data, ...prev]); // add to sidebar

      console.log("New chat created:", data.chat_id);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  }

  const userId = "abc1234";

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

  async function getAIResponse(userId, prompt, chatId) {
    const res = await fetch(`${BACKEND}/api/ai-response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, prompt, chat_id: chatId }),
    });

    const data = await res.json();
    console.log("AI response data:", data);

    // check if backend returned a title
    if (data.title) {
      setChats((prev) =>
        prev.map((chat) =>
          chat.chat_id === chatId
            ? { ...chat, title: data.title } // update sidebar title dynamically
            : chat
        )
      );
    }

    return data.response;
  }

  async function handleSend() {
    const trimmed = input.trim();
    // require either text or image
    if ((!trimmed && !file) || isTyping) return;

    setIsTyping(true);

    //create a new chat if it doesnt exist
    let activeChatId = currentChatId;

    // 1️⃣ If no chat exists, create one first
    if (!activeChatId) {
      try {
        const res = await fetch("http://localhost:5000/api/new-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId, // your logged-in user id
            prompt: trimmed,
            chat_id: currentChatId, // send the first user message to generate title
          }),
        });

        const data = await res.json();
        activeChatId = data.chatId;
        setCurrentChatId(activeChatId);
        setMessages((prev) => [...prev, { sender: "ai", text: data.response }]);

        // If backend returns a new title for this chat, update sidebar
        if (data.title) {
          setChats((prev) =>
            prev.map((c) =>
              c.chat_id === data.chatId ? { ...c, title: data.title } : c
            )
          );
        }
      } catch (err) {
        console.error("Error creating new chat:", err);
        setIsTyping(false);
        return;
      }
    }

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
        form.append("chat_id", currentChatId || "");
        if (selectedImage) form.append("image", selectedImage);

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
        const serverImageUrl = data.imageUrl
          ? `${BACKEND}${data.imageUrl}`
          : data.file_meta?.url
          ? `${BACKEND}${data.file_meta.url}`
          : null;

        

        setMessages((prev) => [...prev, { sender: "ai", text: data.response }]);

        // If backend returns a new title for this chat, update sidebar
        if (data.title) {
          setChats((prev) =>
            prev.map((c) =>
              c.chat_id === data.chatId ? { ...c, title: data.title } : c
            )
          );
        }

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
        const aiText = await getAIResponse(userId, trimmed, currentChatId);
        console.log("Active chat ID:", currentChatId);
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
    <div
      className="flex h-screen  bg-gradient-to-br from-amber-50 via-white to-blue-50"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Sidebar ─── */}
      <Sidebar
        chats={chats}
        onNewChat={handleNewChat}
        selectedId={currentChatId}
        className="w-72 border-r border-slate-200/60 bg-white/50 backdrop-blur-lg"
      />

      <div className="flex flex-col flex-1 justify-center-safe  bg-white/40">
        {/* ─── Messages Area ─── */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Empty State (no messages yet) - CENTERED */}
            {messages.length === 0 && !isTyping && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white text-3xl">
                    💬
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-700 mb-2">
                    Start a conversation
                  </h2>
                  <p className="text-sm text-slate-500">
                    Ask me anything about health and wellness
                  </p>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`flex gap-3 ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                      msg.sender === "user"
                        ? "bg-blue-400"
                        : "bg-gradient-to-br from-indigo-500 to-purple-500"
                    }`}
                    style={
                      msg.sender === "user"
                        ? { backgroundColor: "#60a5fa" }
                        : {}
                    }
                  >
                    {msg.sender === "user" ? "You" : "AI"}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "text-white"
                        : "bg-white text-slate-800 border border-slate-200/60"
                    }`}
                    style={
                      msg.sender === "user"
                        ? { backgroundColor: "#60a5fa" }
                        : {}
                    }
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="uploaded"
                        className="max-w-full rounded mb-2 border"
                      />
                    )}

                    {/* Markdown or plain text */}
                    <div className="prose prose-sm max-w-none">
                      {msg.sender === "ai" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap text-white">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600" />
                <div className="bg-white border border-slate-200/60 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ─── Input Area - CENTERED ─── */}
        <footer className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-slate-200/60 bg-white/40 backdrop-blur-md">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center bg-white rounded-2xl border border-slate-300 shadow-md px-3 py-2">
              {/* Image Upload */}
              <ImageUploader
                onFileSelect={handleImageUpload}
                previewUrl={previewUrl}
              />

              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isTyping}
                className="flex-1 ml-3 mr-3 py-2 text-slate-800 bg-transparent focus:outline-none text-sm placeholder-slate-400"
              />

              {/* Image Preview */}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-10 h-10 rounded-md object-cover mr-3 border"
                />
              )}

              {/* Send Button - FIXED COLOR */}
              <button
                type="submit"
                onClick={handleSend}
                disabled={isTyping}
                className="p-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: "#22c55e" }}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
