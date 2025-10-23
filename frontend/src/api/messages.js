const BASE = "http://localhost:5000";

export async function createChat(userId, title = "Test Chat") {
  const res = await fetch(`${BASE}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, title }),
  });
  console.log("createChat status:", res.status);
  return res.json(); // throws if not JSON
}

export async function sendMessage(chatId, sender, text) {
  const res = await fetch(`${BASE}/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender, text }),
  });
  console.log("sendMessage status:", res.status);
  return res.json();
}
