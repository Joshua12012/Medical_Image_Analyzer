// src/components/Sidebar.jsx
import { motion } from "framer-motion";

export default function Sidebar({
  chats = [],
  onSelectChat,
  onNewChat,
  selectedId,
}) {
  return (
    <aside className="w-72 bg-white/90 border-r border-slate-200 p-4 flex flex-col">
      <button
        onClick={onNewChat}
        className="p-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
        style={{ backgroundColor: "#0CE22A" }}
      >
        <motion.div
          key={chats.chat_id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {chats.title || "New Chat"}
        </motion.div>
      </button>

      <div className="text-xs text-slate-500 mb-3">Your chats</div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {chats.length === 0 ? (
          <div className="text-sm text-slate-400">No chats yet — start one</div>
        ) : (
          chats.map((c) => (
            <button
              style={{ backgroundColor: "#ADD8E6" }}
              key={c.chat_id || c._id || JSON.stringify(c)}
              onClick={() => onSelectChat(c.chat_id)}
              className={`w-full text-left p-3 rounded-md transition hover:bg-slate-100 ${
                selectedId === c.chat_id
                  ? "bg-slate-100 border-l-4 border-blue-600"
                  : ""
              }`}
            >
              <div className="truncate font-medium text-sm">
                {c.title || c.prompt?.slice(0, 30) || "Untitled chat"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {/* optional subtitle */}
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
