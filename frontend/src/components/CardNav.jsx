import { motion } from "framer-motion";
import "./CardNav.css";

export default function CardNav({
  onClick,
  open = false,
  ariaLabel = "Toggle chats",
}) {
  return (
    <motion.button
      onClick={onClick}
      className="cardnav-btn"
      initial={false}
      aria-expanded={open}
      aria-label={ariaLabel}
      whileTap={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28}}
    >
      <motion.svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        className="cardnav-icon"
        aria-hidden
      >
        {/* top line */}
        <motion.rect
          x="3"
          initial={{ y: 6, rotate: 0 }}
          animate={open ? { y: 11, rotate: 45 } : { y: 6, rotate: 0 }}
          width="18"
          height="2"
          rx="1"
          fill="currentColor"
          transformOrigin="12px 12px"
          transition={{ duration: 0.18 }}
        />
        {/* middle line */}
        <motion.rect
          x="3"
          initial={{ y: 11, opacity: 1 }}
          animate={open ? { opacity: 0 } : { opacity: 1 }}
          width="18"
          height="2"
          rx="1"
          fill="currentColor"
          transition={{ duration: 0.12 }}
        />
        {/* bottom line */}
        <motion.rect
          x="3"
          initial={{ y: 16, rotate: 0 }}
          animate={open ? { y: 11, rotate: -45 } : { y: 16, rotate: 0 }}
          width="18"
          height="2"
          rx="1"
          fill="currentColor"
          transformOrigin="12px 12px"
          transition={{ duration: 0.18 }}
        />
      </motion.svg>
    </motion.button>
  );
}
