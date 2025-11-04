// export async function getAIResponse(prompt) {
//   const api_key = import.meta.env.VITE_GROQ_API_KEY?.trim();

//   if (!api_key) {
//     throw new Error("Groq API key is not defined");
//   }
//   try {
//     const response = await fetch(
//       "https://api.groq.com/openai/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${api_key}`,
//         },
//         body: JSON.stringify({
//           model: "groq/compound-mini",
//           messages: [
//             {
//               role: "user",
//               content: prompt,
//             },
//           ],
//         }),
//       }
//     );

//     if (!response.ok) {
//       const errorData = await response.json();
//       console.error("API Error Response:", errorData);
//       throw new Error(
//         `API call failed: ${errorData.error?.message || response.statusText}`
//       );
//     }

//     const data = await response.json();

//     const aiContent = data.choices?.[0]?.message?.content;

//     if (!aiContent) {
//       throw new Error("API response was missing content.");
//     }

//     return aiContent;
//   } catch (err) {
//     console.error("Fetch or API error:", err);
//     throw err;
//   }
// }
// export async function getAIResponse(userId, prompt) {
//   const res = await fetch("http://localhost:5000/api/ai-response", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ userId, prompt }),
//   });
//   const data = await res.json();
//   const aiText = data?.response || "No response received";
//   // console.log("Server response:", data);
//   return aiText;
// }
