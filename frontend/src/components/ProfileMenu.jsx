import { signOut } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase/fireBaseConfig";

export default function ProfileMenu({ username }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState({ username: "" });
  const rootRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Error during logout:", err);
    }
  };
  const initials = username
    .trim()
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={rootRef} className="fixed top-4 right-4 z-50">
      {/* Circular profile button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          backgroundColor: "#0f1720", // dark surface
          color: "#e6eef8", // light text
          border: "1px solid #1f2937", // subtle dark border
        }}
        className="relative w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center font-semibold shadow-sm"
      >
        {initials}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl ring-1 ring-[#111827]/40 overflow-hidden"
            // dark dropdown background
            /* note: inline style to guarantee color if Tailwind config differs */
          >
            <div
              style={{ backgroundColor: "#0b1220", color: "#e6eef8" }}
              className="w-full"
            >
              <div className="px-4 py-3">
                <div className="text-xs text-[#9ca3af]">Signed in as</div>
                <div className="mt-1 font-medium text-[#e6eef8] truncate">
                  {username}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #1f2937" }} />

              <div className="px-2 py-2 flex flex-col gap-1">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                  style={{
                    backgroundColor: "#0f1720",
                    color: "#e6eef8",
                    border: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <Settings className="w-4 h-4 text-[#cbd5e1]" />
                  <span className="text-[#e6eef8]">Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                  style={{
                    backgroundColor: "#0f1720",
                    color: "#e6eef8",
                    border: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <LogOut className="w-4 h-4 text-[#cbd5e1]" />
                  <span className="text-[#e6eef8]">Logout</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
