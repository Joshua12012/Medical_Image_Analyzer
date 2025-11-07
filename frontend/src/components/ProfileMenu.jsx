import { signOut } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase/fireBaseConfig";

export default function ProfileMenu({ username}) {
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
  const initials = (username)
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
          backgroundColor: "#1d4ed8", // fixed blue
          color: "#ffffff", // always white
          border: "1px solid #d1d5db",
        }}
        className="relative w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center font-semibold"
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
            className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl ring-1 ring-[#60a5fa]/40 overflow-hidden bg-[#e5e7eb]"
          >
            <div className="px-4 py-3">
              <div className="text-xs text-[#6b7280]">Signed in as</div>
              <div className="mt-1 font-medium text-[#111827] truncate">
                {username}
              </div>
            </div>

            <div className="border-t border-[#d1d5db]" />

            <div className="px-2 py-2 flex flex-col gap-1">
              <button
                type="button"
                className="w-full flex items-center text-white gap-3 px-3 py-2 hover:bg-[#f3f4f6] transition-colors"
                style={{ backgroundColor: "#8a817c" }}
              >
                <Settings className="w-4 h-4 text-white" />
                <span className="text-white">Settings</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{ backgroundColor: "#8a817c" }}
                className="w-full flex items-center text-white gap-3 px-3 py-2 hover:bg-[#f3f4f6] transition-colors"
              >
                <LogOut className="w-4 h-4 text-white" />
                <span className="text-white">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
