// src/components/Sidebar.jsx
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { useState } from "react";

/**
 * Sidebar
 * Props:
 *  - chats: array
 *  - onSelectChat: function(chatId)
 *  - onNewChat: function()
 *  - selectedId: currently selected chat_id
 *
 * Behavior:
 *  - Desktop (md+): left column, "Your Chats" header toggles dropdown of chat items
 *    with a staggered slide-down animation (same UX you liked earlier).
 *  - Mobile (<md): hidden by default; a floating button opens a full-screen overlay
 *    panel (blurred background). Selecting a chat will call onSelectChat and close the overlay.
 */

export default function Sidebar({
  chats = [],
  onSelectChat,
  onNewChat,
  selectedId,
}) {
  const [isOpen, setIsOpen] = useState(true); // dropdown open (desktop)
  const [isMobileOpen, setIsMobileOpen] = useState(false); // overlay open (mobile)

  // defensive id extractor (covers chat_id, _id, _id.$oid, id)
  const getId = (c) =>
    c?.chat_id ??
    (typeof c?._id === "string" ? c._id : c?._id?.$oid) ??
    c?.id ??
    null;

  // animation variants (staggered dropdown)
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
      y: -10,
      transition: { duration: 0.18, ease: "easeIn" },
    },
  };

  return (
    <>
      {/* ---------- Desktop / tablet sidebar (md+) ---------- */}
      <div className="flex max-h-screen bg-white/40, bg-white/50 text-foreground">
        <aside className="hidden md:flex w-72 shrink-0   p-4 flex-col">
          {/* Header */}
          <div className="flex items-baseline overflow-y-auto justify-evenly mb-3">
            <button
              onClick={() => setIsOpen((s) => !s)}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition font-semibold"
              style={{ backgroundColor: "#a7c957" }}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
              <span>Your Chats</span>
            </button>
            <button
              onClick={onNewChat}
              className="p-2 rounded-full  bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm"
              title="Start a new chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Animated dropdown chat list */}
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.ul
                key="chat-list-desktop"
                initial="closed"
                animate="open"
                exit="closed"
                variants={listVariants}
                className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[calc(100vh-140px)]"
              >
                {chats.length === 0 ? (
                  <motion.li
                    variants={itemVariants}
                    className="px-2 py-2 text-sm text-slate-400"
                  >
                    No chats yet — start one
                  </motion.li>
                ) : (
                  chats.map((c) => {
                    const id = getId(c);
                    const isActive = id && selectedId && id === selectedId;
                    return (
                      <motion.li
                        key={id ?? JSON.stringify(c)}
                        variants={itemVariants}
                      >
                        <button
                          onClick={() => onSelectChat(id)}
                          style={{ backgroundColor: "#A997DF" }}
                          className={`w-full text-left text-white px-3 py-2 rounded-lg transition-all ${
                            isActive
                              ? "bg-blue-50 border-l-4 border-b-green-600 text-green-600 font-medium shadow-sm"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          {c.title || c.prompt?.slice(0, 40) || "Untitled chat"}
                        </button>
                      </motion.li>
                    );
                  })
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </aside>

        {/* ---------- Mobile overlay / full-screen drawer (<md) ---------- */}
        <div className="md:hidden">
          {/* Floating open button in top-left (you can restyle/position outside if desired) */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="fixed top-4 left-4 z-40 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-md border border-white/40"
            aria-label="Open chats"
          >
            <ChevronDown className="w-5 h-5 text-slate-700" />
          </button>

          <AnimatePresence>
            {isMobileOpen && (
              <>
                {/* backdrop blur + dim */}
                <motion.div
                  className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileOpen(false)}
                />

                {/* sliding sheet (from top) - full width */}
                <motion.aside
                  className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-lg p-5 overflow-auto"
                  initial={{ y: "-100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-100%" }}
                  transition={{ type: "spring", stiffness: 90, damping: 20 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Your Chats
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onNewChat}
                        className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 rounded-md text-slate-700"
                        aria-label="Close chats"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-3">
                    {chats.length === 0 ? (
                      <li className="px-3 py-3 rounded-lg text-sm text-slate-500">
                        No chats yet — start one
                      </li>
                    ) : (
                      chats.map((c) => {
                        const id = getId(c);
                        const isActive = id && selectedId && id === selectedId;
                        return (
                          <li key={id ?? JSON.stringify(c)}>
                            <button
                              onClick={() => {
                                onSelectChat(id);
                                setIsMobileOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                                isActive
                                  ? "bg-gray-500 text-blue-700 shadow-md"
                                  : "bg-gray-700 hover:bg-slate-200 text-slate-800"
                              }`}
                            >
                              {c.title ||
                                c.prompt?.slice(0, 40) ||
                                "Untitled chat"}
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
