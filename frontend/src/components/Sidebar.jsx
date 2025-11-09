// src/components/Sidebar.jsx
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import AnimatedList from "./AnimatedList";
import CardNav from "./CardNav";

/*
  Optional: if you install ReactBits or another animated-list package,
  uncomment the import line below and the <AnimatedList> wrapper inside the
  desktop list. Replace the import path if the library exports differently.

  Example (ReactBits):
  import { AnimatedList } from "react-bits";

  Or if you installed "animated-list" (check package docs):
  import AnimatedList from "animated-list";
*/

export default function Sidebar({
  chats = [],
  onSelectChat,
  onNewChat,
  selectedId,
}) {
  const [isOpen, setIsOpen] = useState(true); // dropdown open (desktop)
  const [isMobileOpen, setIsMobileOpen] = useState(false); // overlay open (mobile)
  // Sidebar.jsx (add near the top)
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

  // keep your staggered list open/close variants
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
      <div className="flex max-h-screen text-foreground">
        <aside className="hidden md:flex w-72 shrink-0 p-4 flex-col bg-[#f9f9f9] dark:bg-[#111]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 gap-2">
            {/* Icon-only CardNav (hamburger -> X) */}
            <CardNav
              onClick={() => setIsOpen((s) => !s)}
              open={isOpen}
              ariaLabel={isOpen ? "Close chats" : "Open chats"}
            />

            <motion.button
              onClick={onNewChat}
              className="rounded-full shadow-sm border border-transparent flex items-center justify-center"
              title="Start a new chat"
              initial={false}
              animate={isOpen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{
                width: 36,
                height: 36,
                backgroundColor: "#2b2b2b",
                color: "#fff",
                pointerEvents: isOpen ? "auto" : "none",
              }}
              aria-hidden={!isOpen}
            >
              <Plus className="w-4 h-4" style={{stroke:"white"}} />
            </motion.button>
          </div>

          {/* Smooth dropdown -> use motion.ul with staggered motion.li */}
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                key="sidebar"
                initial="closed"
                animate="open"
                exit="closed"
                variants={listVariants}
                className="h-auto max-h-[calc(100vh-120px)] overflow-hidden w-full rounded-md p-1"
                style={{ willChange: "transform, opacity, height" }}
              >
                <AnimatedList
                  items={chats}
                  onItemSelect={(item) => {
                    const id = getId(item);
                    if (id) onSelectChat(id);
                  }}
                  showGradients={false} // keep UI clean when few items
                  // remove overflow-y-auto to avoid native scrollbar on the sidebar;
                  // AnimatedList will still scroll internally but we hide its scrollbar
                  // explicit maxHeight ensures inner scrolling works even while parent animates height
                  className=""
                  maxHeight={"calc(100vh - 160px)"}
                  displayScrollbar={false}
                  renderItem={(c, idx, isActive) => {
                    const id = getId(c);
                    const title = getChatTitle(c);
                    // button styling: dark rounded pill, hover and active colors
                    return (
                      <div className="px-1">
                        <button
                          onClick={() => onSelectChat(id)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2 ${
                            isActive
                              ? "bg-[#111827] text-white font-medium shadow-sm"
                              : "bg-[#15181b] text-slate-200 hover:bg-[#1f2937]"
                          }`}
                          style={{ minWidth: 0 }}
                        >
                          <span className="truncate">
                            {title || "Untitled chat"}
                          </span>
                        </button>
                      </div>
                    );
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* ---------- Mobile overlay / full-screen drawer (<md) ---------- */}
        <div className="md:hidden">
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
                <motion.div
                  className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileOpen(false)}
                />

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
                        className="p-2 rounded-full bg-gray-900 text-white shadow-sm"
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
                                  ? "bg-gray-200 text-[#111] shadow-md"
                                  : "hover:bg-slate-100 text-slate-900"
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
