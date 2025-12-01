// src/components/Sidebar.jsx — FIXED: USE PROPS FOR MOBILE STATE
import { AnimatePresence, motion } from "framer-motion";
import { MessageCirclePlus, Plus, X } from "lucide-react";
import { useState } from "react";
import CardNav from "./CardNav";

export default function Sidebar({
  chats = [],
  onSelectChat,
  onNewChat,
  selectedId,
  isMobileOpen = false, // From parent
  setIsMobileOpen, // From parent
}) {
  const [isOpen, setIsOpen] = useState(true); // Desktop only

  function getChatTitle(c) {
    if (!c) return "Untitled chat";

    // If it's already a string
    if (typeof c.title === "string" && c.title.trim() !== "") return c.title;

    // If title is object with common keys
    if (c.title && typeof c.title === "object") {
      // try common fields
      if (typeof c.title.text === "string" && c.title.text.trim() !== "")
        return c.title.text;
      if (typeof c.title.name === "string" && c.title.name.trim() !== "")
        return c.title.name;
      if (typeof c.title.title === "string" && c.title.title.trim() !== "")
        return c.title.title;
      // otherwise fall back to a short JSON preview
      try {
        const s = JSON.stringify(c.title);
        return s.length > 60 ? s.slice(0, 57) + "…" : s;
      } catch {
        return "Untitled chat";
      }
    }

    // fallback to prompt
    if (typeof c.prompt === "string" && c.prompt.trim() !== "") {
      return c.prompt.length > 60 ? c.prompt.slice(0, 57) + "…" : c.prompt;
    }

    // last fallback: if messages exist, use first message prompt
    if (Array.isArray(c.messages) && c.messages[0]?.prompt) {
      const p = c.messages[0].prompt;
      return (
        (typeof p === "string" ? p : JSON.stringify(p)).slice(0, 57) +
        (p.length > 57 ? "…" : "")
      );
    }

    return "Untitled chat";
  }

  const getId = (c) =>
    c?.chat_id ??
    (typeof c?._id === "string" ? c._id : c?._id?.$oid) ??
    c?.id ??
    null;

  // Simple staggered list variants (native motion for better performance)
  const listVariants = {
    open: {
      opacity: 1,
      height: "auto",
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.05,
        delayChildren: 0.04,
      },
    },
    closed: {
      opacity: 0,
      height: 0,
      transition: {
        when: "afterChildren",
        staggerChildren: 0.02,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    open: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
    closed: {
      opacity: 0,
      y: -8,
      transition: { duration: 0.18, ease: "easeIn" },
    },
  };

  return (
    <>
      {/* ---------- Desktop / tablet sidebar (md+) ---------- */}
      <div className="flex max-h-screen text-white">
        <motion.aside
          className="hidden md:flex w-72 shrink-0 p-4 flex-col bg-transparent"
          animate={{ width: isOpen ? 288 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ minWidth: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 gap-2">
            {/* Icon-only CardNav (hamburger -> X) */}
            <CardNav
              onClick={() => setIsOpen((s) => !s)}
              open={isOpen}
              ariaLabel={isOpen ? "Close chats" : "Open chats"}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 transition-colors shadow-md" // Fixed size + styling
              style={{ transform: "none" }} // Prevents scaling/expansion
            />

            <motion.button
              onClick={onNewChat}
              className="p-2 rounded-full bg-gradient-to-r  text-white shadow-lg transition-colors" // Explicit gradient bg + hover
              title="Start a new chat"
              initial={false}
              animate={
                isOpen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 } // Fade out, slight shrink when closed
              }
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              aria-hidden={!isOpen}
            >
              <MessageCirclePlus className="w-4 h-4 text-white" />
              {/* Larger icon */}
            </motion.button>
          </div>

          {/* Smooth dropdown -> use motion.ul with staggered motion.li */}
          <AnimatePresence initial={false} mode="wait">
            {isOpen && (
              <motion.ul
                key="sidebar"
                initial="closed"
                animate="open"
                exit="closed"
                variants={listVariants}
                className="h-auto max-h-[calc(100vh-120px)] overflow-y-scroll w-full rounded-md p-1 space-y-1"
                style={{ willChange: "opacity, height" }}
              >
                {chats.map((c, idx) => {
                  const id = getId(c);
                  const title = getChatTitle(c);
                  const isActive = id === selectedId;

                  return (
                    <motion.li
                      key={id ?? idx}
                      variants={itemVariants}
                      className="px-1"
                      layout
                    >
                      <button
                        onClick={() => onSelectChat(id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2 ${
                          isActive
                            ? "bg-black/60 text-white font-medium shadow-sm"
                            : "text-gray-300 hover:bg-black/30"
                        }`}
                        style={{ minWidth: 0 }}
                      >
                        <span className="truncate">
                          {title || "Untitled chat"}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.aside>

        {/* ---------- Mobile overlay / full-screen drawer (<md) ---------- */}
        {/* <div className="md:hidden">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="fixed top-4 left-4 z-40 p-2 bg-black/80 backdrop-blur-md rounded-full shadow-md border border-white/20 text-white"
            aria-label="Open chats"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </button> */}
        <div
          className={`
          ${isMobileOpen ? "flex" : "hidden"}   
          
          flex-col
          absolute md:relative        
          top-0 left-0
          w-full md:w-72
          h-full
          z-30
          bg-black/60 backdrop-blur-xl 
          border-r border-white/10
          p-4
        `}
        >
          {/* Close button visible only on mobile */}
          {/* <button
            onClick={() => setIsMobileOpen(true)}
            className="fixed top-4 left-4 z-40 p-2 bg-black/80 backdrop-blur-md rounded-full shadow-md border border-white/20 text-white"
            aria-label="Open chats"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </button>  */}
          <button
            className="md:hidden absolute top-4 right-4 text-gray-300"
            onClick={() => setIsMobileOpen(false)}
          >
            <X />
          </button>
          <AnimatePresence>
            {isMobileOpen && (
              <>
                <motion.div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileOpen(false)}
                />

                <motion.aside
                  className="fixed inset-x-0 top-0 z-50 bg-black/95 backdrop-blur-lg p-5 overflow-auto text-white max-h-screen"
                  initial={{ y: "-100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-100%" }}
                  transition={{ type: "spring", stiffness: 90, damping: 20 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 rounded-md text-gray-300 hover:text-white"
                        aria-label="Close chats"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={onNewChat}
                        className="p-2 rounded-full bg-gradient-to-r text-white shadow-lg transition-colors"
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-150px)]">
                    {chats.length === 0 ? (
                      <li className="px-3 py-3 rounded-lg text-sm text-gray-400">
                        No chats yet — start one
                      </li>
                    ) : (
                      chats.map((c) => {
                        const id = getId(c);
                        const isActive = id && selectedId && id === selectedId;
                        const title = getChatTitle(c);

                        return (
                          <li key={id ?? JSON.stringify(c)}>
                            <button
                              onClick={() => {
                                onSelectChat(id);
                                setIsMobileOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                                isActive
                                  ? "bg-black/60 text-white shadow-md"
                                  : "text-gray-300 hover:bg-black/30"
                              }`}
                            >
                              {title}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
