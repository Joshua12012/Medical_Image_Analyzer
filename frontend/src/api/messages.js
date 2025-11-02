const BASE = "http://localhost:5000";

// export async function createChat(userId, title = "Test Chat") {
//   const res = await fetch(`${BASE}/api/chats`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ userId, title }),
//   });
//   console.log("createChat status:", res.status);
//   return res.json(); // throws if not JSON
// }

// export async function sendMessage(chatId, sender, text) {
//   const res = await fetch(`${BASE}/api/chats/${chatId}/messages`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ sender, text }),
//   });
//   console.log("sendMessage status:", res.status);
//   return res.json();
// }

export async function createChat(userId, prompt, title = "Chat") {
  const res = await fetch(`${BASE}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, title, prompt }),
  });
  if (!res.ok) throw new Error("createChat failed: " + res.status);
  return res.json(); // { chatId, messages: [{ prompt, response, ts, msgId }] }
}

export async function appendMessage(chatId, prompt) {
  if (!chatId) throw new Error("appendMessage requires chatId");
  const res = await fetch(
    `${BASE}/api/chats/${encodeURIComponent(chatId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }
  );
  if (!res.ok) throw new Error("appendMessage failed: " + res.status);
  return res.json(); // { chatId, messages: [{ prompt, response, ts, msgId }] }
}
