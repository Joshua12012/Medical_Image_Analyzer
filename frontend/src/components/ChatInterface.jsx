// ChatInterface.jsx (updated handleSend to use /chat-connection)
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
import ElectricBorder from "./ElectricBorder";
import ImageUploader from "./ImageUploader";
import ProfileMenu from "./ProfileMenu";
import Sidebar from "./Sidebar";

const BACKEND = "http://localhost:5000"; // change if your FastAPI runs on another port

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [currentChatMessages, setCurrentChatMessages] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {
      console.warn("Failed to parse stored user:", e);
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const profile = {
          username: u.displayName || u.email?.split("@")[0] || "User",
          uid: u.uid,
          email: u.email || null,
        };
        setUser(profile);
        try {
          localStorage.setItem("user", JSON.stringify(profile));
        } catch (e) {
          console.warn("Failed to persist user:", e);
        }
      } else {
        setUser(null);
        try {
          localStorage.removeItem("user");
        } catch {}
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadChats(user.uid);
  }, [user]);

  // Save last chat in localStorage
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem("currentChatId", currentChatId);
    }
  }, [currentChatId]);

  // Restore on mount
  useEffect(() => {
    const storedChatId = localStorage.getItem("currentChatId");
    if (storedChatId) {
      setCurrentChatId(storedChatId);
    }
  }, []);

  async function loadChats(uid) {
    try {
      if (!uid) return;
      const data = await fetchUserChats(uid);
      const normalized = (data.chats || []).map((c) => ({
        ...c,
        chat_id: c.chat_id || c.chatId || c._id || c.id,
      }));
      setChats(normalized);
      if ((data.chats || []).length && !currentChatId) {
        const mostRecent = data.chats[0];
        setCurrentChatId(
          mostRecent.chat_id ||
            mostRecent.chatId ||
            mostRecent._id ||
            mostRecent.id
        );
      }
    } catch (err) {
      console.error("loadChats error:", err);
    }
  }
  useEffect(() => {
    if (!currentChatId || !user?.uid) return;
    handleSelectChat(currentChatId);
  }, [currentChatId, user]);

  async function handleSelectChat(currentChatId) {
    try {
      setCurrentChatId(currentChatId);
      setMessages([]);

      const res = await fetch(`${BACKEND}/api/chat/${currentChatId}`);
      const chat = await res.json();

      const formatted = (chat.messages || []).flatMap((m) => {
        const arr = [];
        if (m.prompt)
          arr.push({
            sender: "user",
            text: m.prompt,
            imageUrl: m.imageUrl || null, // <-- Cloudinary URL
          });
        if (m.response)
          arr.push({
            sender: "ai",
            text: m.response,
            imageUrl: null, // optional if AI returned an image
          });
        return arr;
      });

      setMessages(formatted);

      setChats((prev) =>
        prev.map((c) =>
          c.chat_id === chat.chat_id ? { ...c, title: chat.title } : c
        )
      );
    } catch (err) {
      console.error(err);
    }
  }
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
      const data = await res.json();
      const normalizedId = data.chatId || data.chat_id || data._id;
      const newChat = {
        chat_id: normalizedId,
        title: data.title || "New chat",
        ...data,
      };
      setCurrentChatId(normalizedId);
      setMessages([]);
      setChats((prev) => [newChat, ...prev]);
    } catch (err) {
      console.error("Error creating new chat:", err);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (f) => {
    if (f) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl(null);
    }
  };

  // ---- NEW helper to safely extract AI text from different shapes ----
  function extractAiText(respJson) {
    if (!respJson) return "No response returned.";
    return (
      respJson.response ||
      respJson.assessment ||
      respJson.answer ||
      (typeof respJson === "string" ? respJson : null) ||
      JSON.stringify(respJson || "No response", null, 2)
    );
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed && !file) return;
    setIsTyping(true);

    let activeChatId = currentChatId;
    let cloudinaryImageUrl = null;

    // === STEP 1: UPLOAD IMAGE TO CLOUDINARY FIRST ===
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      console.log("Uploading image to:", `${BACKEND}/upload-image/`);
      console.log("File:", file.name, file.type, file.size);

      try {
        const uploadRes = await fetch(`${BACKEND}/upload-image/`, {
          method: "POST",
          body: formData,
        });

        const text = await uploadRes.text();
        console.log("Upload response:", uploadRes.status, text);

        if (!uploadRes.ok) {
          throw new Error(`Upload failed: ${uploadRes.status} ${text}`);
        }

        const uploadData = JSON.parse(text);
        cloudinaryImageUrl = uploadData.url;
        console.log("Cloudinary URL:", cloudinaryImageUrl);
      } catch (err) {
        console.error("Image upload error:", err);
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `Failed to upload image: ${err.message}`,
            imageUrl: null,
          },
        ]);
        setIsTyping(false);
        return;
      }
    }

    // Show user message immediately
    const userMessage = {
      sender: "user",
      text: trimmed || "[Image]",
      imageUrl: cloudinaryImageUrl || previewUrl, // show preview locally
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // === STEP 2: SEND TO /api/chat-connection WITH CLOUDINARY URL ===
    const payload = {
      userId: user.uid,
      prompt: trimmed,
      chat_id: activeChatId || "",
      image_paths: cloudinaryImageUrl ? [cloudinaryImageUrl] : [],
    };

    try {
      const res = await fetch(`${BACKEND}/api/chat-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      activeChatId = data.chatId;
      setCurrentChatId(activeChatId);

      // Add to sidebar if new chat
      if (!currentChatId) {
        setChats((prev) => [
          { chat_id: activeChatId, title: data.title || "New Chat" },
          ...prev,
        ]);
      }

      // Update title if changed
      if (data.title) {
        setChats((prev) =>
          prev.map((c) =>
            c.chat_id === activeChatId ? { ...c, title: data.title } : c
          )
        );
      }

      // Update message with final Cloudinary URL (in case backend returns one)
      setMessages((prev) => {
        const updated = [...prev];
        const lastUserMsg = updated[updated.length - 2]; // before AI response
        if (lastUserMsg?.sender === "user" && cloudinaryImageUrl) {
          lastUserMsg.imageUrl = cloudinaryImageUrl;
        }
        return [
          ...updated,
          {
            sender: "ai",
            text: data.response || "No response returned.",
            imageUrl: null,
          },
        ];
      });

      // Cleanup
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFile(null);
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Server error. Check console.", imageUrl: null },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  // find index of last AI response so we can highlight it
  let lastAiIndex = -1;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.sender === "ai") lastAiIndex = i;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f9f9f9] dark:bg-[#111]  dark:text-[#f1f1f1] transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar
        chats={[...chats]}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        selectedId={currentChatId}
        className="w-72 border-r border-gray-200  bg-white/70 dark:bg-[#111] "
      />

      {/* Main Area */}
      <div className="flex flex-col flex-1 bg-[#f9f9f9] dark:bg-[#111] transition-colors duration-300">
        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <ProfileMenu username={user?.username || "Guest"} />

          <div className="max-w-3xl mx-auto space-y-6">
            {/* Empty State */}
            {messages.length === 0 && !isTyping && (
              <div className="flex items-center justify-center min-h-[60vh] text-center">
                <div>
                  <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-xl text-2xl">
                    💬
                  </div>
                  <h2 className="text-xl font-semibold mb-2">
                    Start a new conversation
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ask me anything — I’m listening.
                  </p>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => {
                const isUser = msg.sender === "user";
                const isLatestAi = msg.sender === "ai" && i === lastAiIndex;
                const wrapperClass = `flex gap-3 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`;

                const userBubbleClass = `max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed border transition bg-gray-800 text-white border-gray-700`;

                const aiBubbleClass = `w-full max-w-full md:max-w-[900px] px-4 py-3 rounded-2xl text-sm leading-relaxed border transition bg-gray-100 dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100`;

                const bubbleContent = isUser ? (
                  <div className={userBubbleClass}>
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="uploaded"
                        className="w-56 h-auto rounded-lg mb-3 object-contain border border-gray-300 dark:border-gray-700"
                      />
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ) : (
                  <div className={aiBubbleClass}>
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="uploaded"
                        className="w-56 h-auto rounded-lg mb-3 object-contain border border-gray-300 dark:border-gray-700"
                      />
                    )}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                );

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={wrapperClass}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(i)} // keyboard accessible
                    onBlur={() => setHoveredIndex(null)}
                    tabIndex={-1} // make div focusable for keyboard users
                  >
                    {/* Avatar */}
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shadow-sm ${
                        isUser
                          ? "bg-gray-700 text-white"
                          : "bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                      }`}
                    >
                      {isUser ? "U" : "AI"}
                    </div>

                    {/* compute dynamic props */}
                    {(() => {
                      const isHovered = hoveredIndex === i;
                      // customize how you map hover to thickness/color
                      const dynamicThickness = isHovered ? 3 : 3;
                      const dynamicColor = isHovered ? "#00b4d8" : "#00b4d8";
                      // optionally change speed/chaos too:
                      const dynamicSpeed = isHovered ? 1.2 : 0.8;
                      const dynamicChaos = isHovered ? 0.3 : 0.1;

                      // Message bubble wrapped by ElectricBorder only for the AI bubble you want
                      if (isLatestAi) {
                        return (
                          <ElectricBorder
                            color={dynamicColor}
                            thickness={dynamicThickness}
                            speed={dynamicSpeed}
                            chaos={dynamicChaos}
                            style={{
                              borderRadius: 14,
                              transition: "all 180ms ease",
                            }}
                          >
                            {bubbleContent}
                          </ElectricBorder>
                        );
                      }
                      // non-latest AI / user messages just show bubble (but still react to hover if you want)
                      return bubbleContent;
                    })()}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse" />
                <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <footer className="shrink-0 px-6 pb-6 pt-4 bg-[#111] transition-colors duration-300">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-blue-500 transition">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#2a2a2a] hover:bg-[#333] transition">
                <ImageUploader
                  onFileSelect={handleImageUpload}
                  previewUrl={previewUrl}
                />
              </div>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message..."
                disabled={isTyping}
                className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500 text-sm px-3"
                onKeyDown={handleKeyPress}
              />

              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-9 h-9 rounded-md object-cover border border-gray-700 ml-2"
                />
              )}

              <button
                type="submit"
                onClick={handleSend}
                disabled={isTyping}
                className="ml-2 p-2 rounded-lg bg-[#6891FA] hover:bg-[#5479D6] transition flex items-center justify-center"
                style={{ minWidth: "38px", minHeight: "38px" }}
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
