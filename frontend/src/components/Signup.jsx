import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useState } from "react";
import { auth } from "../firebase/fireBaseConfig";
import ElectricBorder from "./ElectricBorder";
import TextType from "./TextType";

export default function Signup({ onSignupSuccess }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: username });
      onSignupSuccess?.(userCredential.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f13]">
      <div className="text-center mb-6">
        <h1>
          <TextType
            text={[
              "Welcome!",
              "Create your account now!",
              "Start Automating with AI",
            ]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="|"
          />
        </h1>
      </div>
      <ElectricBorder
        color="#7df9ff"
        speed={1}
        chaos={0.1}
        thickness={3}
        style={{ borderRadius: 16 }}
      >
        <form
          onSubmit={handleSignup}
          className="flex flex-col gap-3 w-72 p-6 rounded shadow-md bg-[#0f1720]"
          style={{ border: "1px solid rgba(255,255,255,0.03)" }}
        >
          <h2 className="text-xl text-white font-bold text-center">Sign Up</h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-gray-700 text-white bg-[#0b1220] p-2 rounded"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-700 text-white bg-[#0b1220] p-2 rounded"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-700 text-white bg-[#0b1220] p-2 rounded"
            required
          />

          <button
            type="submit"
            className="bg-[#2563eb] text-white py-2 rounded"
          >
            Create Account
          </button>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </ElectricBorder>
    </div>
  );
}
