// import { useState } from "react";

// function ChatInput({ onSend, isTyping }) {
//   const [prompt, setPrompt] = useState("");
//   const [file, setFile] = useState(null);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     onSend(prompt.trim(), file);
//     setPrompt("");
//     setFile(null);
//   };

//   return (
//     <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex flex-col sm:flex-row gap-2">
//       <input
//         type="file"
//         accept="image/*"
//         onChange={(e) => setFile(e.target.files[0])}
//         className="sm:w-1/4 text-sm"
//       />
//       <textarea
//         value={prompt}
//         onChange={(e) => setPrompt(e.target.value)}
//         placeholder="Type your message..."
//         className="grow p-2 border rounded"
//       />
//       <button
//         type="submit"
//         disabled={isTyping}
//         className="px-4 py-2 bg-blue-600 text-white rounded"
//       >
//         {isTyping ? "Sending..." : "Send"}
//       </button>
//     </form>
//   );
// }
// export default ChatInput;

import { useState } from "react";

function ChatInput({ onSend, isTyping }) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(prompt.trim(), file);
    setPrompt("");
    setFile(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white dark:bg-gray-900 flex flex-col sm:flex-row gap-3 shadow-[0_0_10px_rgba(0,0,0,0.08)] border border-gray-200 dark:border-gray-700 rounded-xl m-3"
    >
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="sm:w-1/4 text-sm cursor-pointer file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-blue-100 file:text-blue-600 hover:file:bg-blue-200 transition-all"
      />

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Type your message..."
        className="grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px]"
      />

      <button
        type="submit"
        disabled={isTyping}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
      >
        {isTyping ? "Sending..." : "Send"}
      </button>
    </form>
  );
}

export default ChatInput;
