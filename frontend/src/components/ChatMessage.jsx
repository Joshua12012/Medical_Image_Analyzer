function ChatMessage({ sender, text }) {
  // return (
  //   <div>
  //     <strong>{sender === "user" ? "You: " : "AI: "}</strong>
  //     {text}
  //   </div>
  // );
  return (
    <div className={`flex ${sender ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs p-3 rounded-lg shadow ${
          sender
            ? "bg-blue-600 text-black rounded-br-none"
            : "bg-gray-200 text-gray-900 rounded-bl-none"
        }`}
      >
        <strong className="block mb-1">{sender ? "You" : "AI"}:</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

export default ChatMessage;
