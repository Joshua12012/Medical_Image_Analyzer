import { signOut } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase/fireBaseConfig";

export default function ProfileMenu({ username = "User" }) {
  const [open, setOpen] = useState(false);
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
  const initials = (username || "U")
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
        className="relative w-10 h-10 rounded-2xl overflow-hidden border  border-gray-300 
             text-black font-semibold flex items-center justify-center 
             shadow-sm  bg-blue-700 "
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
            className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-200 backdrop-blur-md text-white shadow-xl ring-1 ring-blue-400/40 overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="text-xs text-slate-500">Signed in as</div>
              <div className="mt-1 font-medium text-slate-900 truncate">
                {username}
              </div>
            </div>

            <div className="border-t border-slate-200/60" />

            <div className="px-2 py-2 flex flex-col gap-1">
              <button
                type="button"
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-600" />
                <span className="text-slate-800">Settings</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-600" />
                <span className="text-slate-800">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
