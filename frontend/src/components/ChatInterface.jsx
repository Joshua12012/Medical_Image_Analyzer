// // ChatInterface.jsx (updated handleSend to use /chat-connection)
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
// import { LoaderFive } from "./loader"; // ← ADD THIS LINE
// import Particles from "./Particles";
// import ProfileMenu from "./ProfileMenu";
// import Sidebar from "./Sidebar";

// const BACKEND = "http://localhost:5000"; // change if your FastAPI runs on another port

// function ChatInterface() {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [isTyping, setIsTyping] = useState(false);
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [file, setFile] = useState(null);
//   const [chats, setChats] = useState([]);
//   const [currentChatId, setCurrentChatId] = useState(null);
//   const [selectedChatId, setSelectedChatId] = useState(null);
//   const [currentChatMessages, setCurrentChatMessages] = useState(null);
//   const [user, setUser] = useState(null);
//   const [authLoading, setAuthLoading] = useState(true);
//   const [hoveredIndex, setHoveredIndex] = useState(null);
//   const [isMobileOpen, setIsMobileOpen] = useState(false);

//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem("user");
//       if (stored) setUser(JSON.parse(stored));
//     } catch (e) {
//       console.warn("Failed to parse stored user:", e);
//     }

//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (u) {
//         const profile = {
//           username: u.displayName || u.email?.split("@")[0] || "User",
//           uid: u.uid,
//           email: u.email || null,
//         };
//         setUser(profile);
//         try {
//           localStorage.setItem("user", JSON.stringify(profile));
//         } catch (e) {
//           console.warn("Failed to persist user:", e);
//         }
//       } else {
//         setUser(null);
//         try {
//           localStorage.removeItem("user");
//         } catch {}
//       }
//       setAuthLoading(false);
//     });

//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     if (!user) return;
//     loadChats(user.uid);
//   }, [user]);

//   // Save last chat in localStorage
//   useEffect(() => {
//     if (currentChatId) {
//       localStorage.setItem("currentChatId", currentChatId);
//     }
//   }, [currentChatId]);

//   // Restore on mount
//   useEffect(() => {
//     const storedChatId = localStorage.getItem("currentChatId");
//     if (storedChatId) {
//       setCurrentChatId(storedChatId);
//     }
//   }, []);

//   async function loadChats(uid) {
//     try {
//       if (!uid) return;
//       const data = await fetchUserChats(uid);
//       const normalized = (data.chats || []).map((c) => ({
//         ...c,
//         chat_id: c.chat_id || c.chatId || c._id || c.id,
//       }));
//       setChats(normalized);
//       if ((data.chats || []).length && !currentChatId) {
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
//   useEffect(() => {
//     if (!currentChatId || !user?.uid) return;
//     handleSelectChat(currentChatId);
//   }, [currentChatId, user]);

//   async function handleSelectChat(currentChatId) {
//     try {
//       setCurrentChatId(currentChatId);
//       setMessages([]);

//       const res = await fetch(`${BACKEND}/api/chat/${currentChatId}`);
//       const chat = await res.json();

//       const formatted = (chat.messages || []).flatMap((m) => {
//         const arr = [];
//         if (m.prompt)
//           arr.push({
//             sender: "user",
//             text: m.prompt,
//             imageUrl: m.imageUrl || null, // <-- Cloudinary URL
//           });
//         if (m.response)
//           arr.push({
//             sender: "ai",
//             text: m.response,
//             imageUrl: null, // optional if AI returned an image
//           });
//         return arr;
//       });

//       setMessages(formatted);

//       setChats((prev) =>
//         prev.map((c) =>
//           c.chat_id === chat.chat_id ? { ...c, title: chat.title } : c
//         )
//       );
//     } catch (err) {
//       console.error(err);
//     }
//   }
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
//       const data = await res.json();
//       const normalizedId = data.chatId || data.chat_id || data._id;
//       const newChat = {
//         chat_id: normalizedId,
//         title: data.title || "New chat",
//         ...data,
//       };
//       setCurrentChatId(normalizedId);
//       setMessages([]);
//       setChats((prev) => [newChat, ...prev]);
//     } catch (err) {
//       console.error("Error creating new chat:", err);
//     }
//   }

//   const handleKeyPress = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   const handleImageUpload = (f) => {
//     if (f) {
//       if (previewUrl) URL.revokeObjectURL(previewUrl);
//       setFile(f);
//       setPreviewUrl(URL.createObjectURL(f));
//     } else {
//       if (previewUrl) URL.revokeObjectURL(previewUrl);
//       setFile(null);
//       setPreviewUrl(null);
//     }
//   };

//   // ---- NEW helper to safely extract AI text from different shapes ----
//   function extractAiText(respJson) {
//     if (!respJson) return "No response returned.";
//     return (
//       respJson.response ||
//       respJson.assessment ||
//       respJson.answer ||
//       (typeof respJson === "string" ? respJson : null) ||
//       JSON.stringify(respJson || "No response", null, 2)
//     );
//   }

//   async function handleSend() {
//     const trimmed = input.trim();
//     if (!trimmed && !file) return;
//     setIsTyping(true);

//     let activeChatId = currentChatId;
//     let cloudinaryImageUrl = null;

//     // === STEP 1: UPLOAD IMAGE TO CLOUDINARY FIRST ===
//     if (file) {
//       const formData = new FormData();
//       formData.append("file", file);

//       // console.log("Uploading image to:", `${BACKEND}/upload-image/`);
//       // console.log("File:", file.name, file.type, file.size);

//       try {
//         const uploadRes = await fetch(`${BACKEND}/upload-image/`, {
//           method: "POST",
//           body: formData,
//         });

//         const text = await uploadRes.text();
//         // console.log("Upload response:", uploadRes.status, text);

//         if (!uploadRes.ok) {
//           throw new Error(`Upload failed: ${uploadRes.status} ${text}`);
//         }

//         const uploadData = JSON.parse(text);
//         cloudinaryImageUrl = uploadData.url;
//         // console.log("Cloudinary URL:", cloudinaryImageUrl);
//       } catch (err) {
//         console.error("Image upload error:", err);
//         setMessages((prev) => [
//           ...prev,
//           {
//             sender: "ai",
//             text: `Failed to upload image: ${err.message}`,
//             imageUrl: null,
//           },
//         ]);
//         setIsTyping(false);
//         return;
//       }
//     }

//     // Show user message immediately
//     const userMessage = {
//       sender: "user",
//       text: trimmed || "[Image]",
//       imageUrl: cloudinaryImageUrl || previewUrl, // show preview locally
//     };
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");

//     // === STEP 2: SEND TO /api/chat-connection WITH CLOUDINARY URL ===
//     const payload = {
//       userId: user.uid,
//       prompt: trimmed,
//       chat_id: activeChatId || "",
//       image_paths: cloudinaryImageUrl ? [cloudinaryImageUrl] : [],
//     };

//     try {
//       const res = await fetch(`${BACKEND}/api/chat-connection`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const text = await res.text();
//         throw new Error(`HTTP ${res.status}: ${text}`);
//       }

//       const data = await res.json();
//       activeChatId = data.chatId;
//       setCurrentChatId(activeChatId);

//       // Add to sidebar if new chat
//       if (!currentChatId) {
//         setChats((prev) => [
//           { chat_id: activeChatId, title: data.title || "New Chat" },
//           ...prev,
//         ]);
//       }

//       // Update title if changed
//       if (data.title) {
//         setChats((prev) =>
//           prev.map((c) =>
//             c.chat_id === activeChatId ? { ...c, title: data.title } : c
//           )
//         );
//       }

//       // Update message with final Cloudinary URL (in case backend returns one)
//       setMessages((prev) => {
//         const updated = [...prev];
//         const lastUserMsg = updated[updated.length - 2]; // before AI response
//         if (lastUserMsg?.sender === "user" && cloudinaryImageUrl) {
//           lastUserMsg.imageUrl = cloudinaryImageUrl;
//         }
//         return [
//           ...updated,
//           {
//             sender: "ai",
//             text: data.response || "No response returned.",
//             imageUrl: null,
//           },
//         ];
//       });

//       // Cleanup
//       if (previewUrl) URL.revokeObjectURL(previewUrl);
//       setPreviewUrl(null);
//       setFile(null);
//     } catch (err) {
//       console.error("Send error:", err);
//       setMessages((prev) => [
//         ...prev,
//         { sender: "ai", text: "Server error. Check console.", imageUrl: null },
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
//     <>
//       {/* <div className="relative flex h-screen w-full bg-black text-white"> */}
//       <div className="flex flex-col md:flex-row h-screen bg-black text-white">
//         {/* BIG, GORGEOUS, HIGHLY VISIBLE COSMIC PARTICLES – ONLY WHEN EMPTY */}
//         {messages.length === 0 && !isTyping && (
//           <div className="fixed inset-0 pointer-events-none">
//             <Particles
//               particleColors={["#ffffff", "#ffffff"]}
//               particleCount={350} // fewer but bigger = cleaner & more premium
//               particleSpread={20} // wider spread = deeper space feel
//               speed={0.3} // slow & calm floating
//               particleBaseSize={180} // THIS MAKES THEM BIG AND VISIBLE
//               moveParticlesOnHover={true} // beautiful interaction
//               alphaParticles={true} // soft fade at edges
//               disableRotation={true} // pure glowing orbs, no spinning
//             />
//           </div>
//         )}

//         {/* Sidebar & Main Content – above particles */}
//         <div className="relative z-10 flex w-full h-full">
//           <Sidebar
//             chats={chats}
//             onSelectChat={handleSelectChat}
//             onNewChat={handleNewChat}

//             selectedId={currentChatId}
//             isMobileOpen={isMobileOpen}            // <- pass down
//             setIsMobileOpen={setIsMobileOpen}
//             className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-2xl"
//           />

//           <div className="flex flex-col flex-1">
//             <main className="flex-1 overflow-y-auto px-6 py-8">
//               <ProfileMenu username={user?.username || "Guest"} />

//               <div className="max-w-3xl mx-auto space-y-6">
//                 {/* Empty State */}
//                 {messages.length === 0 && !isTyping && (
//                   <div className="flex items-center justify-center min-h-[60vh] text-center">
//                     <div>
//                       {/*After (Add a white background and rounded corners to the container):*/}
//                       <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center hover:scale-105 transition-transform duration-300">
//                         <svg
//                           viewBox="0 0 100 100"
//                           fill="none"
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="w-full h-full drop-shadow-lg"
//                         >
//                           {/* 1. Define Gradients for 3D Look */}
//                           <defs>
//                             <linearGradient
//                               id="blueGradient"
//                               x1="50"
//                               y1="0"
//                               x2="50"
//                               y2="100"
//                               gradientUnits="userSpaceOnUse"
//                             >
//                               <stop offset="0%" stopColor="#4dabf7" />{" "}
//                               {/* Light Blue Top */}
//                               <stop offset="100%" stopColor="#2563eb" />{" "}
//                               {/* Dark Blue Bottom */}
//                             </linearGradient>
//                             <filter
//                               id="shadowBlur"
//                               x="-20%"
//                               y="-20%"
//                               width="140%"
//                               height="140%"
//                             >
//                               <feGaussianBlur stdDeviation="2" result="blur" />
//                               <feComposite
//                                 in="SourceGraphic"
//                                 in2="blur"
//                                 operator="over"
//                               />
//                             </filter>
//                           </defs>

//                           {/* 2. Blue Rounded Square Background */}
//                           <rect
//                             x="5"
//                             y="5"
//                             width="90"
//                             height="90"
//                             rx="28"
//                             fill="url(#blueGradient)"
//                           />

//                           {/* 3. Top Highlight (Glossy Effect) */}
//                           <ellipse
//                             cx="50"
//                             cy="20"
//                             rx="30"
//                             ry="10"
//                             fill="white"
//                             fillOpacity="0.2"
//                           />

//                           {/* 4. White Speech Bubble */}
//                           <path
//                             d="M50 25C35 25 23 35 23 48C23 55 27 61 33 65L30 74L42 68C44.5 68.5 47 69 50 69C65 69 77 58 77 48C77 35 65 25 50 25Z"
//                             fill="white"
//                             filter="drop-shadow(0px 4px 2px rgba(0,0,0,0.1))"
//                           />

//                           {/* 5. Three Black Dots */}
//                           <circle cx="39" cy="48" r="4" fill="#1a1a1a" />
//                           <circle cx="50" cy="48" r="4" fill="#1a1a1a" />
//                           <circle cx="61" cy="48" r="4" fill="#1a1a1a" />
//                         </svg>
//                       </div>
//                       <h2 className="text-xl font-semibold mb-2">
//                         Start a new conversation
//                       </h2>
//                       <p className="text-sm text-gray-500 dark:text-gray-400">
//                         Ask me anything — I’m listening.
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Messages */}
//                 <AnimatePresence mode="popLayout">
//                   {messages.map((msg, i) => {
//                     const isUser = msg.sender === "user";
//                     const isLatestAi = msg.sender === "ai" && i === lastAiIndex;
//                     const wrapperClass = `flex gap-3 ${
//                       isUser ? "flex-row-reverse" : "flex-row"
//                     }`;

//                     const userBubbleClass = `max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed border transition bg-gray-800 text-white border-gray-700`;

//                     const aiBubbleClass = `w-full max-w-full md:max-w-[900px] px-4 py-3 rounded-2xl text-sm leading-relaxed border transition bg-gray-100 dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100`;

//                     const bubbleContent = isUser ? (
//                       <div className={userBubbleClass}>
//                         {msg.imageUrl && (
//                           <img
//                             src={msg.imageUrl}
//                             alt="uploaded"
//                             className="w-56 h-auto rounded-lg mb-3 object-contain border border-gray-300 dark:border-gray-700"
//                           />
//                         )}
//                         <p className="whitespace-pre-wrap">{msg.text}</p>
//                       </div>
//                     ) : (
//                       <div className={aiBubbleClass}>
//                         {msg.imageUrl && (
//                           <img
//                             src={msg.imageUrl}
//                             alt="uploaded"
//                             className="w-56 h-auto rounded-lg mb-3 object-contain border border-gray-300 dark:border-gray-700"
//                           />
//                         )}
//                         <div className="prose prose-sm dark:prose-invert max-w-none">
//                           <ReactMarkdown
//                             remarkPlugins={[remarkGfm]}
//                             rehypePlugins={[rehypeHighlight]}
//                           >
//                             {msg.text}
//                           </ReactMarkdown>
//                         </div>
//                       </div>
//                     );

//                     return (
//                       <motion.div
//                         key={i}
//                         initial={{ opacity: 0, y: 10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -10 }}
//                         transition={{ duration: 0.2 }}
//                         className={wrapperClass}
//                         onMouseEnter={() => setHoveredIndex(i)}
//                         onMouseLeave={() => setHoveredIndex(null)}
//                         onFocus={() => setHoveredIndex(i)}
//                         onBlur={() => setHoveredIndex(null)}
//                         tabIndex={-1}
//                       >
//                         {/* Avatar */}
//                         <div
//                           className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shadow-sm ${
//                             isUser
//                               ? "bg-gray-700 text-white"
//                               : "bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
//                           }`}
//                         >
//                           {isUser ? "U" : "AI"}
//                         </div>

//                         {/* ElectricBorder only for latest AI */}
//                         {(() => {
//                           const isHovered = hoveredIndex === i;
//                           const dynamicThickness = isHovered ? 3 : 3;
//                           const dynamicColor = isHovered
//                             ? "#00b4d8"
//                             : "#00b4d8";
//                           const dynamicSpeed = isHovered ? 1.2 : 0.8;
//                           const dynamicChaos = isHovered ? 0.3 : 0.1;

//                           if (isLatestAi) {
//                             return (
//                               <ElectricBorder
//                                 color={dynamicColor}
//                                 thickness={dynamicThickness}
//                                 speed={dynamicSpeed}
//                                 chaos={dynamicChaos}
//                                 style={{
//                                   borderRadius: 14,
//                                   transition: "all 180ms ease",
//                                 }}
//                               >
//                                 {bubbleContent}
//                               </ElectricBorder>
//                             );
//                           }
//                           return bubbleContent;
//                         })()}
//                       </motion.div>
//                     );
//                   })}
//                 </AnimatePresence>

//                 {/* Beautiful Generating Loader */}
//                 {isTyping && (
//                   <div className="flex justify-left w-full my-8">
//                     <LoaderFive text="Generating chat..." />
//                   </div>
//                 )}
//               </div>
//             </main>

//             {/* INPUT BAR – ORIGINAL COLOR/STYLE RESTORED */}
//             {/* INPUT BAR – BEAUTIFUL & FINAL */}
//             <footer className="shrink-0 px-3 pb-4 pt-3">
//               <div className="max-w-3xl mx-auto">
//                 <div className="flex items-center gap-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-4xl px-1 py-1 shadow-2xl ring-1 ring-white/5">
//                   <ImageUploader
//                     onFileSelect={handleImageUpload}
//                     previewUrl={previewUrl}
//                   />

//                   <input
//                     type="text"
//                     value={input}
//                     onChange={(e) => setInput(e.target.value)}
//                     onKeyDown={handleKeyPress}
//                     placeholder="Send a message..."
//                     disabled={isTyping}
//                     className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-base px-0.5"
//                   />

//                   {previewUrl && (
//                     <img
//                       src={previewUrl}
//                       alt="preview"
//                       className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-500/50 shadow-lg"
//                     />
//                   )}

//                   <button
//                     onClick={handleSend}
//                     disabled={isTyping || (!input.trim() && !file)}
//                     style={{ borderRadius: "1.5rem", backgroundColor: "white" }}
//                     className="p-3.5  disabled:opacity-50 transition-all duration-200 transform hover:scale-110 shadow-lg"
//                   >
//                     <Send className="w-4 h-7 text-black" />
//                   </button>
//                 </div>
//               </div>
//             </footer>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// export default ChatInterface;

// src/components/ChatInterface.jsx
import { onAuthStateChanged } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import "highlight.js/styles/github.css";
import { ChevronDown, Send, X as XIcon } from "lucide-react"; // use lucide ChevronDown + X
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { fetchUserChats } from "../api/chats";
import { auth } from "../firebase/fireBaseConfig";
import ElectricBorder from "./ElectricBorder";
import ImageUploader from "./ImageUploader";
import { LoaderFive } from "./loader";
import Particles from "./Particles";
import ProfileMenu from "./ProfileMenu";
import Sidebar from "./Sidebar";

const BACKEND = "http://localhost:5000";

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

  // Parent-controlled mobile drawer state:
  // - only this button toggles it (so there's no duplicate hidden buttons)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem("currentChatId", currentChatId);
    }
  }, [currentChatId]);

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
            imageUrl: m.imageUrl || null,
          });
        if (m.response)
          arr.push({ sender: "ai", text: m.response, imageUrl: null });
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

  // handleSend, handleImageUpload, extractAiText — unchanged (paste your current implementations)
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
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const uploadRes = await fetch(`${BACKEND}/upload-image/`, {
          method: "POST",
          body: formData,
        });
        const text = await uploadRes.text();
        if (!uploadRes.ok) {
          throw new Error(`Upload failed: ${uploadRes.status} ${text}`);
        }
        const uploadData = JSON.parse(text);
        cloudinaryImageUrl = uploadData.url;
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

    const userMessage = {
      sender: "user",
      text: trimmed || "[Image]",
      imageUrl: cloudinaryImageUrl || previewUrl,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

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

      if (!currentChatId) {
        setChats((prev) => [
          { chat_id: activeChatId, title: data.title || "New Chat" },
          ...prev,
        ]);
      }

      if (data.title) {
        setChats((prev) =>
          prev.map((c) =>
            c.chat_id === activeChatId ? { ...c, title: data.title } : c
          )
        );
      }

      setMessages((prev) => {
        const updated = [...prev];
        const lastUserMsg = updated[updated.length - 2];
        if (lastUserMsg?.sender === "user" && cloudinaryImageUrl)
          lastUserMsg.imageUrl = cloudinaryImageUrl;
        return [
          ...updated,
          {
            sender: "ai",
            text: data.response || "No response returned.",
            imageUrl: null,
          },
        ];
      });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFile(null);
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Server error...check console", imageUrl: null },
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
    <>
      {/* Mobile-first layout */}
      {/* <div className="flex flex-col md:flex-row h-screen bg-black text-white"> */}
      <div className="flex flex-col md:flex-row h-screen bg-black text-white overflow-x-hidden">
        {/* Particles + empty-hero (unchanged) */}
        {messages.length === 0 && !isTyping && (
          <div className="fixed inset-0 pointer-events-none">
            <Particles
              particleColors={["#ffffff", "#ffffff"]}
              particleCount={350}
              particleSpread={20}
              speed={0.3}
              particleBaseSize={180}
              moveParticlesOnHover={true}
              alphaParticles={true}
              disableRotation={true}
            />
          </div>
        )}

        <div className="relative z-10 flex w-full h-full">
          {/* Sidebar receives mobile state / controller from here */}
          <Sidebar
            chats={chats}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            selectedId={currentChatId}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
            className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-2xl"
          />

          <div className="flex flex-col flex-1">
            {/*
              SINGLE MOBILE TOGGLE BUTTON
              - Visible only on small screens (md:hidden)
              - Rotates the chevron and crossfades to X when open
              - This replaces the duplicate/hidden close behind ProfileMenu
            */}
            <div>
              <motion.button
                onClick={() => setIsMobileOpen((s) => !s)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-black/80 backdrop-blur-md rounded-full shadow-md border border-white/20 text-white"
                aria-label={isMobileOpen ? "Close chats" : "Open chats"}
                initial={false}
                // subtle scale feedback when pressed
                whileTap={{ scale: 0.95 }}
              >
                {/* Animate rotation of chevron; crossfade into X icon when open */}
                <AnimatePresence mode="wait" initial={false}>
                  {!isMobileOpen ? (
                    <motion.span
                      key="chev"
                      initial={{ opacity: 0, rotate: -10 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 10 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 24,
                      }}
                      className="flex"
                    >
                      <ChevronDown className="w-5 h-5 text-white" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="x"
                      initial={{ opacity: 0, rotate: 10 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: -10 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 24,
                      }}
                      className="flex"
                    >
                      <XIcon className="w-5 h-5 text-white" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <main className="flex-1 overflow-y-auto px-6 py-8">
              <ProfileMenu username={user?.username || "Guest"} />

              {/* Hero / empty state — ensure this is visible on mobile/desktop */}
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.length === 0 && !isTyping && (
                  <div className="flex items-center justify-center min-h-[60vh] text-center">
                    <div>
                      <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center hover:scale-105 transition-transform duration-300">
                        {/* SVG hero preserved unchanged */}
                        <svg
                          viewBox="0 0 100 100"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-full h-full drop-shadow-lg"
                        >
                          <defs>
                            <linearGradient
                              id="blueGradient"
                              x1="50"
                              y1="0"
                              x2="50"
                              y2="100"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop offset="0%" stopColor="#4dabf7" />
                              <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                            <filter
                              id="shadowBlur"
                              x="-20%"
                              y="-20%"
                              width="140%"
                              height="140%"
                            >
                              <feGaussianBlur stdDeviation="2" result="blur" />
                              <feComposite
                                in="SourceGraphic"
                                in2="blur"
                                operator="over"
                              />
                            </filter>
                          </defs>

                          <rect
                            x="5"
                            y="5"
                            width="90"
                            height="90"
                            rx="28"
                            fill="url(#blueGradient)"
                          />
                          <ellipse
                            cx="50"
                            cy="20"
                            rx="30"
                            ry="10"
                            fill="white"
                            fillOpacity="0.2"
                          />
                          <path
                            d="M50 25C35 25 23 35 23 48C23 55 27 61 33 65L30 74L42 68C44.5 68.5 47 69 50 69C65 69 77 58 77 48C77 35 65 25 50 25Z"
                            fill="white"
                            filter="drop-shadow(0px 4px 2px rgba(0,0,0,0.1))"
                          />
                          <circle cx="39" cy="48" r="4" fill="#1a1a1a" />
                          <circle cx="50" cy="48" r="4" fill="#1a1a1a" />
                          <circle cx="61" cy="48" r="4" fill="#1a1a1a" />
                        </svg>
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

                {/* Messages listing — unchanged */}
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
                        onFocus={() => setHoveredIndex(i)}
                        onBlur={() => setHoveredIndex(null)}
                        tabIndex={-1}
                      >
                        <div
                          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shadow-sm ${
                            isUser
                              ? "bg-gray-700 text-white"
                              : "bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                          }`}
                        >
                          {isUser ? "U" : "AI"}
                        </div>

                        {(() => {
                          const isHovered = hoveredIndex === i;
                          const dynamicThickness = isHovered ? 3 : 3;
                          const dynamicColor = isHovered
                            ? "#00b4d8"
                            : "#00b4d8";
                          const dynamicSpeed = isHovered ? 1.2 : 0.8;
                          const dynamicChaos = isHovered ? 0.3 : 0.1;

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
                          return bubbleContent;
                        })()}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {isTyping && (
                  <div className="flex justify-left w-full my-8">
                    <LoaderFive text="Generating chat..." />
                  </div>
                )}
              </div>
            </main>

            {/* Input bar unchanged — preserves functionality */}
            {/* <footer className="shrink-0 px-3 pb-4 pt-3">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-4xl px-1 py-1 shadow-2xl ring-1 ring-white/5">
                  <ImageUploader onFileSelect={handleImageUpload} previewUrl={previewUrl} />

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Send a message..."
                    disabled={isTyping}
                    className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-base px-0.5"
                  />

                  {previewUrl && <img src={previewUrl} alt="preview" className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-500/50 shadow-lg" />}

                  <button
                    onClick={handleSend}
                    disabled={isTyping || (!input.trim() && !file)}
                    style={{ borderRadius: "1.5rem", backgroundColor: "white" }}
                    className="p-3.5 disabled:opacity-50 transition-all duration-200 transform hover:scale-110 shadow-lg"
                  >
                    <Send className="w-4 h-7 text-black" />
                  </button>
                </div>
              </div>
            </footer> */}
           <footer className="px-3 pb-8 pt-3 shrink-0 w-full max-w-full overflow-hidden">

              <div className="max-w-3xl border border-white/10 rounded-4xl px-1 py-3 shadow-2xl ring-1 ring-white/5 mx-auto h-full flex flex-col gap-2 max-h-full overflow-hidden">

                {/* ===== Preview row (safe, isolated, no overflow) ===== */}
                {previewUrl && (
                  <div className="w-full max-w-full flex justify-start overflow-hidden">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-cyan-400 bg-black/40">
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* ===== Input bar ===== */}
                <div className="flex items-center  overflow-hidden">
                  {/* Image uploader */}
                  <div className="shrink-0">
                    <ImageUploader
                      onFileSelect={handleImageUpload}
                      previewUrl={previewUrl}
                    />
                  </div>

                  {/* Input (MUST have min-w-0 or it forces overflow!) */}
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Send a message..."
                    disabled={isTyping}
                    className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder-gray-400 text-base px-2 py-2"
                  />

                  {/* Send button - fixed size, never overflows */}
                  <button
                    onClick={handleSend}
                    disabled={isTyping || (!input.trim() && !file)}
                    style={{ borderRadius: "1.5rem", backgroundColor: "white" }}
                    className="p-3.5 shrink-0 disabled:opacity-50 transition-all duration-200 transform hover:scale-110 shadow-lg"
                  >
                    <Send className="w-4 h-7 text-black" />
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatInterface;
