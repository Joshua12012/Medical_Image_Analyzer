// // .jsx
// import { onAuthStateChanged } from "firebase/auth";
// import { AnimatePresence, motion } from "framer-motion";
// import "highlight.js/styles/github.css";
// import { Send } from "lucide-react";
// import { useEffect, useState } from "react";
// import ReactMarkdown from "react-markdown";
// import rehypeHighlight from "rehype-highlight";
// import remarkGfm from "remark-gfm";
// import { fetchUserChats } from "../api/chats";
// import { auth } from "../firebase/fireBaseConfig";
// import ElectricBorder from "./ElectricBorder";
// import ImageUploader from "./ImageUploader";
// import ProfileMenu from "./ProfileMenu";
// import Sidebar from "./Sidebar";

// const createChat = async (userId, title) => {
//   return { _id: `chat_${Date.now()}` };
// };

// const sendMessage = async (chatId, sender, text) => {
//   return { sender, text, timestamp: Date.now() };
// };

// const BACKEND = "http://localhost:5000"; // change if your FastAPI runs on another port

// function ChatInterface() {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [isTyping, setIsTyping] = useState(false);
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [file, setFile] = useState(null); // <--- added file state
//   const [chats, setChats] = useState([]);
//   const [currentChatId, setCurrentChatId] = useState(null);
//   const [selectedChatId, setSelectedChatId] = useState(null);
//   const [currentChatMessages, setCurrentChatMessages] = useState(null);
//   // const [userId, setUserId] = useState(null);

//   // load chats once on mount
//   const [user, setUser] = useState(null);
//   const [authLoading, setAuthLoading] = useState(true);

//   useEffect(() => {
//     // 1) Load cached user from localStorage once (if present)
//     try {
//       const stored = localStorage.getItem("user");
//       if (stored) {
//         setUser(JSON.parse(stored));
//       }
//     } catch (e) {
//       console.warn("Failed to parse stored user:", e);
//     }

//     // 2) Subscribe to Firebase auth state changes
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (u) {
//         // Compose a lightweight profile object
//         const profile = {
//           username: u.displayName || u.email?.split("@")[0] || "User",
//           uid: u.uid,
//           email: u.email || null,
//         };

//         setUser(profile);
//         try {
//           localStorage.setItem("user", JSON.stringify(profile));
//         } catch (e) {
//           console.warn("Failed to persist user to localStorage:", e);
//         }
//       } else {
//         // logged out
//         setUser(null);
//         try {
//           localStorage.removeItem("user");
//         } catch {}
//       }
//       setAuthLoading(false);
//     });

//     return () => unsub();
//   }, []);

//   // Fetch chats whenever `user` is set
//   useEffect(() => {
//     if (!user) return; // wait until user exists
//     loadChats(user.uid); // or user.userId, depending on your naming
//   }, [user]);

//   // 2) loadChats - actually uses fetchUserChats and sets chats
//   async function loadChats(uid) {
//     try {
//       if (!uid) return;
//       const data = await fetchUserChats(uid);
//       // normalize id field so we always use chat_id on client
//       const normalized = (data.chats || []).map((c) => ({
//         ...c,
//         chat_id: c.chat_id || c.chatId || c._id || c.id,
//       }));
//       setChats(normalized);
//       if ((data.chats || []).length && !currentChatId) {
//         // open most recent chat
//         const mostRecent = data.chats[0];
//         setCurrentChatId(
//           mostRecent.chat_id ||
//             mostRecent.chatId ||
//             mostRecent._id ||
//             mostRecent.id
//         );
//       }
//     } catch (err) {
//       console.error("loadChats error:", err);
//     }
//   }

//   async function handleSelectChat(currentChatId) {
//     try {
//       setCurrentChatId(currentChatId);
//       console.log(currentChatId);
//       setMessages([]); // optional clear

//       const res = await fetch(
//         `http://localhost:5000/api/chat/${currentChatId}`
//       );
//       // if (!res.ok) throw new Error("Failed to fetch chat data");

//       const chat = await res.json();
//       console.log("Loaded chat:", chat);

//       // Normalize messages into your UI format
//       const formatted = (chat.messages || []).flatMap((m) => {
//         const arr = [];
//         if (m.prompt)
//           arr.push({
//             sender: "user",
//             text: m.prompt,
//             imageUrl: m.imageUrl || null,
//           });
//         if (m.response) arr.push({ sender: "ai", text: m.response });
//         return arr;
//       });

//       setMessages(formatted);

//       // Update sidebar immediately
//       setChats((prev) =>
//         prev.map((c) =>
//           c.chat_id === chat.chat_id ? { ...c, title: chat.title } : c
//         )
//       );
//     } catch (err) {
//       console.error(err);
//     }
//   }

//   // call when user clicks on new chat
//   async function handleNewChat() {
//     if (!user?.uid) {
//       console.error("No user logged in");
//       return;
//     }
//     try {
//       const res = await fetch(`${BACKEND}/api/new-chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userId: user.uid }),
//       });

//       console.log(user.uid);

//       const data = await res.json();
//       // Normalize id field - backend might return chatId or chat_id or _id
//       const normalizedId = data.chatId || data.chat_id || data._id;
//       const newChat = {
//         chat_id: normalizedId,
//         title: data.title || "New chat",
//         ...data,
//       };
//       console.log(newChat);

//       setCurrentChatId(normalizedId);
//       setMessages([]);
//       setChats((prev) => [newChat, ...prev]);
//       console.log("New chat created:", newChat.chat_id);
//     } catch (err) {
//       console.error("Error creating chat:", err);
//     }
//   }

//   // handle Enter key
//   const handleKeyPress = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   // callback passed to the ImageUploader component
//   const handleImageUpload = (f) => {
//     // f is either a File or null
//     if (f) {
//       // clear any previous local object URL
//       if (previewUrl) URL.revokeObjectURL(previewUrl);
//       setFile(f);
//       setPreviewUrl(URL.createObjectURL(f));
//     } else {
//       // clear
//       if (previewUrl) URL.revokeObjectURL(previewUrl);
//       setFile(null);
//       setPreviewUrl(null);
//     }
//   };

//   // async function getAIResponse(userId, prompt, chatId) {
//   //   const res = await fetch(`${BACKEND}/api/ai-response`, {
//   //     method: "POST",
//   //     headers: { "Content-Type": "application/json" },
//   //     body: JSON.stringify({ userId: user.uid, prompt, chat_id: chatId }),
//   //   });

//   //   const data = await res.json();
//   //   console.log("AI response data:", data);

//   //   // check if backend returned a title
//   //   if (data.title) {
//   //     setChats((prev) =>
//   //       prev.map((chat) =>
//   //         chat.chat_id === chatId
//   //           ? { ...chat, title: data.title } // update sidebar title dynamically
//   //           : chat
//   //       )
//   //     );
//   //   }

//   //   return data.response;
//   // }

//   async function getAIResponse(userId, prompt, chatId = null) {
//     try {
//       const response = await fetch(`${BACKEND}/api/analyze-image-text`, {
//         method: "POST",
//         body: (() => {
//           const formData = new FormData();
//           formData.append("userId", userId);
//           formData.append("prompt", prompt);
//           if (chatId) formData.append("chat_id", chatId);
//           // no image here, just text
//           return formData;
//         })(),
//       });

//       if (!response.ok) {
//         const text = await response.text();
//         throw new Error(text || `HTTP ${response.status}`);
//       }

//       const data = await response.json();
//       console.log("Text AI response:", data);

//       // Ensure the returned text is always a clean string
//       return typeof data.response === "string"
//         ? data.response
//         : data.response?.answer ||
//             JSON.stringify(data.response || "No response received", null, 2);
//     } catch (err) {
//       console.error("getAIResponse error:", err);
//       return "Server error. Unable to fetch AI response.";
//     }
//   }

//   async function handleSend() {
//     const trimmed = input.trim();
//     if ((!trimmed && !file) || isTyping) return;

//     setIsTyping(true);
//     let activeChatId = currentChatId;

//     // 1️⃣ Create a new chat if none exists
//     if (!activeChatId) {
//       try {
//         const res = await fetch(`${BACKEND}/api/new-chat`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             userId: user.uid,
//             prompt: trimmed,
//             chat_id: currentChatId,
//           }),
//         });

//         const data = await res.json();
//         activeChatId = data.chatId;
//         setCurrentChatId(activeChatId);

//         if (data.title) {
//           // Update client state first (normalize ids used in state)
//           setChats((prev) =>
//             prev.map((c) =>
//               (c.chat_id || c.chatId || c._id || c.id) ===
//               (data.chatId || data.chat_id || data._id)
//                 ? { ...c, title: data.title }
//                 : c
//             )
//           );

//           // Persist title back to your server so DB is updated
//           try {
//             await fetch(`${BACKEND}/api/update-chat-title`, {
//               method: "POST", // or PATCH according to your API
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 chat_id: data.chatId || data.chat_id || activeChatId,
//                 title: data.title,
//               }),
//             });
//           } catch (err) {
//             console.warn("Failed to persist chat title:", err);
//           }
//         }
//       } catch (err) {
//         console.error("Error creating new chat:", err);
//         setIsTyping(false);
//         return;
//       }
//     }

//     // 2️⃣ Show user’s message instantly
//     const userMessage = {
//       sender: "user",
//       text: trimmed || "[Image]",
//       imageUrl: previewUrl || null,
//     };
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");

//     try {
//       // 3️⃣ Always call Lightning AI (Qwen) API for both text and image
//       const formData = new FormData();
//       formData.append("userId", user.uid);
//       formData.append("prompt", trimmed);
//       formData.append("chat_id", activeChatId || "");

//       // Append image only if selected
//       if (file) formData.append("image", file);

//       const res = await fetch(`${BACKEND}/api/analyze-image-text`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!res.ok) {
//         const text = await res.text();
//         throw new Error(`HTTP ${res.status}: ${text}`);
//       }

//       const data = await res.json();
//       console.log("AI (Qwen via Lightning) Response:", data);

//       // 4️⃣ Handle possible image URL returned by backend
//       const serverImageUrl = data.imageUrl
//         ? `${BACKEND}${data.imageUrl}`
//         : data.file_meta?.url
//         ? `${BACKEND}${data.file_meta.url}`
//         : null;

//       if (data.title) {
//         // Update client state first (normalize ids used in state)
//         setChats((prev) =>
//           prev.map((c) =>
//             (c.chat_id || c.chatId || c._id || c.id) ===
//             (data.chatId || data.chat_id || data._id)
//               ? { ...c, title: data.title }
//               : c
//           )
//         );

//         // Persist title back to your server so DB is updated
//         try {
//           await fetch(`${BACKEND}/api/update-chat-title`, {
//             method: "POST", // or PATCH according to your API
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               chat_id: data.chatId || data.chat_id || activeChatId,
//               title: data.title,
//             }),
//           });
//         } catch (err) {
//           console.warn("Failed to persist chat title:", err);
//         }
//       }

//       // Update message image URL if replaced by server-side version
//       if (serverImageUrl) {
//         setMessages((prev) => {
//           const copy = [...prev];
//           for (let i = copy.length - 1; i >= 0; i--) {
//             if (copy[i].sender === "user" && copy[i].imageUrl) {
//               copy[i] = { ...copy[i], imageUrl: serverImageUrl };
//               break;
//             }
//           }
//           return copy;
//         });
//       }

//       // ✅ AI text response handling
//       const aiText =
//         typeof data.response === "string"
//           ? data.response
//           : data.response?.answer
//           ? data.response.answer
//           : JSON.stringify(data.response || "No response received", null, 2);

//       setMessages((prev) => [
//         ...prev,
//         { sender: "ai", text: aiText, imageUrl: null },
//       ]);

//       // Cleanup preview
//       if (previewUrl) {
//         URL.revokeObjectURL(previewUrl);
//         setPreviewUrl(null);
//       }
//       setFile(null);
//     } catch (err) {
//       console.error("Send error:", err);
//       setMessages((prev) => [
//         ...prev,
//         {
//           sender: "ai",
//           text: "⚠️ Server error. Check console.",
//           imageUrl: null,
//         },
//       ]);
//     } finally {
//       setIsTyping(false);
//     }
//   }

//   // find index of last AI response so we can highlight it
//   let lastAiIndex = -1;
//   for (let i = 0; i < messages.length; i++) {
//     if (messages[i]?.sender === "ai") lastAiIndex = i;
//   }

//   return (
//     <div className="flex h-screen w-full overflow-hidden bg-[#f9f9f9] dark:bg-[#111]  dark:text-[#f1f1f1] transition-colors duration-300">
//       {/* Sidebar */}
//       <Sidebar
//         chats={[...chats]}
//         onSelectChat={handleSelectChat}
//         onNewChat={handleNewChat}
//         selectedId={currentChatId}
//         className="w-72 border-r border-gray-200  bg-white/70 dark:bg-[#111] "
//       />

//       {/* Main Area */}
//       <div className="flex flex-col flex-1 bg-[#f9f9f9] dark:bg-[#111] transition-colors duration-300">
//         {/* Messages Area */}
//         <main className="flex-1 overflow-y-auto px-6 py-8">
//           <ProfileMenu username={user?.username || "Guest"} />

//           <div className="max-w-3xl mx-auto space-y-6">
//             {/* Empty State */}
//             {messages.length === 0 && !isTyping && (
//               <div className="flex items-center justify-center min-h-[60vh] text-center">
//                 <div>
//                   <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-xl text-2xl">
//                     💬
//                   </div>
//                   <h2 className="text-xl font-semibold mb-2">
//                     Start a new conversation
//                   </h2>
//                   <p className="text-sm text-gray-500 dark:text-gray-400">
//                     Ask me anything — I’m listening.
//                   </p>
//                 </div>
//               </div>
//             )}

//             {/* Chat Messages */}
//             <AnimatePresence mode="popLayout">
//               {messages.map((msg, i) => {
//                 const isUser = msg.sender === "user";
//                 const isLatestAi = msg.sender === "ai" && i === lastAiIndex;
//                 const wrapperClass = `flex gap-3 ${
//                   isUser ? "flex-row-reverse" : "flex-row"
//                 }`;

//                 // user bubble: keep original max-width behavior so user messages remain unchanged
//                 const userBubbleClass = `max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed border transition bg-gray-800 text-white border-gray-700`;

//                 // ai bubble: allow full width (fits message column) and keep ai styling
//                 const aiBubbleClass = `w-full max-w-full md:max-w-[900px] px-4 py-3 rounded-2xl text-sm leading-relaxed border transition bg-gray-100 dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100`;

//                 const bubbleContent = isUser ? (
//                   <div className={userBubbleClass}>
//                     {msg.imageUrl && (
//                       <img
//                         src={msg.imageUrl}
//                         alt="uploaded"
//                         className="w-56 h-auto rounded-lg mb-3 object-contain border border-gray-300 dark:border-gray-700"
//                       />
//                     )}
//                     <p className="whitespace-pre-wrap">{msg.text}</p>
//                   </div>
//                 ) : (
//                   <div className={aiBubbleClass}>
//                     {msg.imageUrl && (
//                       <img
//                         src={msg.imageUrl}
//                         alt="uploaded"
//                         className="w-56 h-auto rounded-lg mb-3 object-contain border border-gray-300 dark:border-gray-700"
//                       />
//                     )}
//                     <div className="prose prose-sm dark:prose-invert max-w-none">
//                       <ReactMarkdown
//                         remarkPlugins={[remarkGfm]}
//                         rehypePlugins={[rehypeHighlight]}
//                       >
//                         {msg.text}
//                       </ReactMarkdown>
//                     </div>
//                   </div>
//                 );

//                 return (
//                   <motion.div
//                     key={i}
//                     initial={{ opacity: 0, y: 10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -10 }}
//                     transition={{ duration: 0.2 }}
//                     className={wrapperClass}
//                   >
//                     {/* Avatar */}
//                     <div
//                       className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shadow-sm ${
//                         isUser
//                           ? "bg-gray-700 text-white"
//                           : "bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
//                       }`}
//                     >
//                       {isUser ? "U" : "AI"}
//                     </div>

//                     {/* Message Bubble (wrap latest AI response with ElectricBorder) */}
//                     {isLatestAi ? (
//                       <ElectricBorder
//                         color="#00b4d8"
//                         speed={0.8}
//                         chaos={0.1}
//                         thickness={3}
//                         style={{ borderRadius: 14 }}
//                       >
//                         {bubbleContent}
//                       </ElectricBorder>
//                     ) : (
//                       bubbleContent
//                     )}
//                   </motion.div>
//                 );
//               })}
//             </AnimatePresence>

//             {/* Typing Indicator */}
//             {isTyping && (
//               <div className="flex gap-3 items-center">
//                 <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse" />
//                 <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
//                   <div className="flex gap-1">
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150" />
//                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300" />
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </main>

//         {/* Input Area */}
//         {/* Input Area */}
//         <footer className="shrink-0 px-6 pb-6 pt-4 bg-[#111] transition-colors duration-300">
//           <div className="max-w-3xl mx-auto">
//             <div className="flex items-center bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-blue-500 transition">
//               {/* Image Upload Icon */}
//               <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#2a2a2a] hover:bg-[#333] transition">
//                 <ImageUploader
//                   onFileSelect={handleImageUpload}
//                   previewUrl={previewUrl}
//                 />
//               </div>

//               {/* Text Input */}
//               <input
//                 type="text"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 placeholder="Message..."
//                 disabled={isTyping}
//                 className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500 text-sm px-3"
//               />

//               {/* Image Preview */}
//               {previewUrl && (
//                 <img
//                   src={previewUrl}
//                   alt="preview"
//                   className="w-9 h-9 rounded-md object-cover border border-gray-700 ml-2"
//                 />
//               )}

//               {/* Send Button */}
//               <button
//                 type="submit"
//                 onClick={handleSend}
//                 disabled={isTyping}
//                 className="ml-2 p-2 rounded-lg bg-[#6891FA] hover:bg-[#5479D6] transition flex items-center justify-center"
//                 style={{ minWidth: "38px", minHeight: "38px" }}
//               >
//                 <Send className="w-5 h-5 text-white" />
//               </button>
//             </div>
//           </div>
//         </footer>
//       </div>
//     </div>
//   );
// }

// export default ChatInterface;

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

  // ---- UPDATED handleSend: calls BACKEND + "/chat-connection" ----
  async function handleSend() {
    const trimmed = input.trim();
    if ((!trimmed && !file) || isTyping) return;

    setIsTyping(true);
    let activeChatId = currentChatId;

    // CREATE NEW CHAT if none exists
    if (!activeChatId) {
      try {
        // Send to backend /chat-connection (Groq title generated server-side)
        const fd = new FormData();
        fd.append("userId", user.uid);
        fd.append("prompt", trimmed);
        fd.append("session_id", ""); // let backend assign UUID
        if (file) fd.append("files", file);

        const res = await fetch(`${BACKEND}/api/chat-connection`, {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        activeChatId = data.chatId;
        setCurrentChatId(activeChatId);

        // Add new chat to sidebar immediately with Groq-generated title
        const newChat = {
          chat_id: activeChatId,
          title: data.title || "New Chat",
        };
        setChats((prev) => [newChat, ...prev]);
      } catch (err) {
        console.error("Error creating new chat:", err);
        setIsTyping(false);
        return;
      }
    }

    // Show user message instantly
    const userMessage = {
      sender: "user",
      text: trimmed || "[Image]",
      imageUrl: previewUrl || null,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      // Send the actual request to backend
      const fd = new FormData();
      fd.append("userId", user.uid);
      fd.append("prompt", trimmed);
      fd.append("session_id", activeChatId);
      if (file) fd.append("files", file);

      const res = await fetch(`${BACKEND}/api/chat-connection`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();

      // Update last AI message
      const aiText = data.response || "No response returned.";
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: aiText, imageUrl: null },
      ]);

      // Update chat title in sidebar in case backend returned a new title
      if (data.title) {
        setChats((prev) =>
          prev.map((c) =>
            c.chat_id === activeChatId ? { ...c, title: data.title } : c
          )
        );
      }

      // Cleanup file & preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setFile(null);
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "⚠️ Server error. Check console.",
          imageUrl: null,
        },
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

                    {/* Message Bubble (wrap latest AI response with ElectricBorder) */}
                    {isLatestAi ? (
                      <ElectricBorder
                        color="#00b4d8"
                        speed={0.8}
                        chaos={0.1}
                        thickness={3}
                        style={{ borderRadius: 14 }}
                      >
                        {bubbleContent}
                      </ElectricBorder>
                    ) : (
                      bubbleContent
                    )}
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
