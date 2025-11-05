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
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex flex-col sm:flex-row gap-2">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="sm:w-1/4 text-sm"
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Type your message..."
        className="grow p-2 border rounded"
      />
      <button
        type="submit"
        disabled={isTyping}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {isTyping ? "Sending..." : "Send"}
      </button>
    </form>
  );
}

export default ChatInput;
