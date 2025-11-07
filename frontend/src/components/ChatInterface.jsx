// .jsx
import { onAuthStateChanged } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import "highlight.js/styles/github.css";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { fetchUserChats } from "../api/chats";
import { auth } from "../firebase/fireBaseConfig";
import ImageUploader from "./ImageUploader";
import ProfileMenu from "./ProfileMenu";
import Sidebar from "./Sidebar";

const createChat = async (userId, title) => {
  return { _id: `chat_${Date.now()}` };
};

const sendMessage = async (chatId, sender, text) => {
  return { sender, text, timestamp: Date.now() };
};

const BACKEND = "http://localhost:5000"; // change if your FastAPI runs on another port

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null); // <--- added file state
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [currentChatMessages, setCurrentChatMessages] = useState(null);
  // const [userId, setUserId] = useState(null);

  // load chats once on mount
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // 1) Load cached user from localStorage once (if present)
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to parse stored user:", e);
    }

    // 2) Subscribe to Firebase auth state changes
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Compose a lightweight profile object
        const profile = {
          username: u.displayName || u.email?.split("@")[0] || "User",
          uid: u.uid,
          email: u.email || null,
        };

        setUser(profile);
        try {
          localStorage.setItem("user", JSON.stringify(profile));
        } catch (e) {
          console.warn("Failed to persist user to localStorage:", e);
        }
      } else {
        // logged out
        setUser(null);
        try {
          localStorage.removeItem("user");
        } catch {}
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch chats whenever `user` is set
  useEffect(() => {
    if (!user) return; // wait until user exists
    loadChats(user.uid); // or user.userId, depending on your naming
  }, [user]);

  // 2) loadChats - actually uses fetchUserChats and sets chats
  async function loadChats(uid) {
    try {
      if (!uid) return;
      // fetchUserChats should return { chats: [...] } — adapt if your API differs
      const data = await fetchUserChats(uid);
      setChats(data.chats || []);
      if ((data.chats || []).length && !currentChatId) {
        // open most recent chat
        const mostRecent = data.chats[0];
        setCurrentChatId(
          mostRecent.chat_id || mostRecent.chatId || mostRecent._id
        );
      }
    } catch (err) {
      console.error("loadChats error:", err);
    }
  }

  async function handleSelectChat(currentChatId) {
    try {
      setCurrentChatId(currentChatId);
      console.log(currentChatId);
      setMessages([]); // optional clear

      const res = await fetch(
        `http://localhost:5000/api/chat/${currentChatId}`
      );
      // if (!res.ok) throw new Error("Failed to fetch chat data");

      const chat = await res.json();
      console.log("Loaded chat:", chat);

      // Normalize messages into your UI format
      const formatted = (chat.messages || []).flatMap((m) => {
        const arr = [];
        if (m.prompt)
          arr.push({
            sender: "user",
            text: m.prompt,
            imageUrl: m.imageUrl || null,
          });
        if (m.response) arr.push({ sender: "ai", text: m.response });
        return arr;
      });

      setMessages(formatted);

      // Update sidebar immediately
      setChats((prev) =>
        prev.map((c) =>
          c.chat_id === chat.chat_id ? { ...c, title: chat.title } : c
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  // call when user clicks on new chat
  async function handleNewChat() {
    if (!user?.uid) {
      console.error("No user logged in");
      return;
    }
    try {
      const res = await fetch(`${BACKEND}/api/new-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      console.log(user.uid);

      const data = await res.json();
      // Normalize id field - backend might return chatId or chat_id or _id
      const normalizedId = data.chatId || data.chat_id || data._id;
      const newChat = {
        chat_id: normalizedId,
        title: data.title || "New chat",
        ...data,
      };
      console.log(newChat);

      setCurrentChatId(normalizedId);
      setMessages([]);
      setChats((prev) => [newChat, ...prev]);
      console.log("New chat created:", newChat.chat_id);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  }

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

  // async function getAIResponse(userId, prompt, chatId) {
  //   const res = await fetch(`${BACKEND}/api/ai-response`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ userId: user.uid, prompt, chat_id: chatId }),
  //   });

  //   const data = await res.json();
  //   console.log("AI response data:", data);

  //   // check if backend returned a title
  //   if (data.title) {
  //     setChats((prev) =>
  //       prev.map((chat) =>
  //         chat.chat_id === chatId
  //           ? { ...chat, title: data.title } // update sidebar title dynamically
  //           : chat
  //       )
  //     );
  //   }

  //   return data.response;
  // }

  async function getAIResponse(userId, prompt, chatId = null) {
    try {
      const response = await fetch(`${BACKEND}/api/analyze-image-text`, {
        method: "POST",
        body: (() => {
          const formData = new FormData();
          formData.append("userId", userId);
          formData.append("prompt", prompt);
          if (chatId) formData.append("chat_id", chatId);
          // no image here, just text
          return formData;
        })(),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Text AI response:", data);

      // Ensure the returned text is always a clean string
      return typeof data.response === "string"
        ? data.response
        : data.response?.answer ||
            JSON.stringify(data.response || "No response received", null, 2);
    } catch (err) {
      console.error("getAIResponse error:", err);
      return "Server error. Unable to fetch AI response.";
    }
  }

  async function handleSend() {
    const trimmed = input.trim();
    if ((!trimmed && !file) || isTyping) return;

    setIsTyping(true);

    let activeChatId = currentChatId;

    // 1️⃣ Create a new chat if it doesn't exist
    if (!activeChatId) {
      try {
        const res = await fetch("http://localhost:5000/api/new-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            prompt: trimmed,
            chat_id: currentChatId,
          }),
        });

        const data = await res.json();
        activeChatId = data.chatId;
        setCurrentChatId(activeChatId);

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

    // 2️⃣ Add user message immediately
    const userMessage = {
      sender: "user",
      text: trimmed || "[Image]",
      imageUrl: previewUrl || null,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      if (file) {
        // 3️⃣ Handle image+text upload
        const formData = new FormData();
        formData.append("userId", user.uid);
        formData.append("prompt", trimmed); // use trimmed text instead of input
        formData.append("chat_id", currentChatId || "");
        formData.append("image", file);

        const res = await fetch(`${BACKEND}/api/analyze-image-text`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("AI Image Analysis Response:", data);

        const serverImageUrl = data.imageUrl
          ? `${BACKEND}${data.imageUrl}`
          : data.file_meta?.url
          ? `${BACKEND}${data.file_meta.url}`
          : null;

        if (data.title) {
          setChats((prev) =>
            prev.map((c) =>
              c.chat_id === data.chatId ? { ...c, title: data.title } : c
            )
          );
        }

        // replace optimistic image
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

        // ✅ Guarantee AI text is always a string
        const aiText =
          typeof data.response === "string"
            ? data.response
            : data.response?.answer
            ? data.response.answer
            : JSON.stringify(data.response || "No response received", null, 2);

        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: aiText, imageUrl: null },
        ]);
      } else {
        // 4️⃣ Handle text-only messages
        const result = await getAIResponse(
          user.uid,
          currentChatId,
          trimmed,
          null
        );
        console.log("AI Text Result:", result);

        // ✅ Safe extraction for consistent Markdown rendering
        const aiText =
          typeof result === "string"
            ? result
            : result?.response ||
              result?.answer ||
              JSON.stringify(result, null, 2);

        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: aiText, imageUrl: null },
        ]);
      }

      // cleanup
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
      className="flex h-screen w-full overflow-hidden bg-[#f5f5f5] dark:bg-[#f5f5f5] text-foreground"
      style={{ colorScheme: "light" }}
    >
      {/* ─── Sidebar ─── */}
      <Sidebar
        chats={[...chats]}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        selectedId={currentChatId}
        className="w-72 border-r border-slate-200/60 bg-white/50 backdrop-blur-lg"
      />

      <div className="flex flex-col flex-1 justify-center-safe  bg-white/40">
        {/* ─── Messages Area ─── */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <ProfileMenu
            username={user && user.username ? user.username : "Guest"}
          />

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Empty State (no messages yet) - CENTERED */}
            {messages.length === 0 && !isTyping && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white text-3xl">
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
                    className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                      msg.sender === "user"
                        ? "bg-blue-400"
                        : "bg-linear-to-br from-indigo-500 to-purple-500"
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
                <div className="w-8 h-8 rounded-md bg-linear-to-br from-blue-500 to-indigo-600" />
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
        <footer className="shrink-0 px-6 pb-6 pt-4 bg-white/40 backdrop-blur-lg transition-all duration-500 border-t-0 shadow-none">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center bg-white/90 rounded-2xl shadow-md px-3 py-2 backdrop-blur-md">
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

              {/* Send Button */}
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

export default ChatInterface;
