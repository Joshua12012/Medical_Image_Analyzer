import { motion } from "framer-motion";
import { useState } from "react";

function ChatInput({ onSend }) {
  const [value, setValue] = useState("");

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed); // pass it up to App.jsx
    setValue(""); // clear input after sending
  }

  // return (
  //   <div>
  //     <input
  //       type="text"
  //       value={value}
  //       onChange={(e) => setValue(e.target.value)}
  //       placeholder="Type your message..."
  //     />
  //     <button onClick={handleSend}>Send</button>
  //   </div>
  // );
  return (
    <div className="flex space-x-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 px-4 py-2 rounded-lg border text-black border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <motion.button
        onClick={handleSend}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Send
      </motion.button>
    </div>
  );
}

export default ChatInput;
