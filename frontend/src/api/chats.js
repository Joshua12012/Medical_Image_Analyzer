// src/api/chats.js
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export async function fetchUserChats(userId) {
  const res = await fetch(`${BASE}/api/user-chats/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`fetchUserChats failed: ${res.status}`);
  return await res.json(); // expected: { chats: [...] }
}

export async function createChatBackend(userId, title = "") {
  // optional backend create endpoint. If your backend doesn't have it,
  // the frontend will fall back to optimistic creation.
  const res = await fetch(`${BASE}/api/create-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, title })
  });
  if (!res.ok) throw new Error(`createChatBackend failed: ${res.status}`);
  return await res.json(); // expected: created chat object
}
