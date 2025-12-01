

import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useState } from "react";
import { auth } from "../firebase/fireBaseConfig";
import ElectricBorder from "./ElectricBorder";
import Particles from "./Particles"; // Make sure this file exists
import TextType from "./TextType";

export default function Signup({ onSignupSuccess }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setError(""); // clear previous errors

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      // Set displayName (username)
      await updateProfile(userCredential.user, { displayName: username });
      onSignupSuccess?.(userCredential.user);
    } catch (err) {
      setError(
        err.message.includes("weak-password")
          ? "Password should be at least 6 characters"
          : err.message
      );
    }
  }

  return (
    <>
      {/* PURE BLACK BACKGROUND + WHITE FLOATING COSMIC PARTICLES */}
      <div className="fixed inset-0 -z-10 bg-black overflow-hidden">
        <Particles
          particleColors={["#ffffff", "#ffffff"]} // Pure white only
          particleCount={400} // Dense starfield
          particleSpread={15}
          speed={0.5} // Gentle floating motion
          particleBaseSize={80} // Small glowing dots
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={true} // Clean floating orbs, no spin
        />
      </div>

      {/* MAIN CONTENT - centered on top */}
      <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-4">
        {/* Animated Heading */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            <TextType
              text={[
                "Welcome!",
                "Create your account now!",
                "Start Automating with AI",
              ]}
              typingSpeed={80}
              pauseDuration={1500}
              showCursor={true}
              cursorCharacter="|"
            />
          </h1>
        </div>

        {/* Signup Form with Electric Border */}
        <ElectricBorder
          color="#7df9ff"
          speed={1.3}
          chaos={0.12}
          thickness={4}
          style={{ borderRadius: 20 }}
        >
          <form
            onSubmit={handleSignup}
            className="flex flex-col gap-3 w-72 p-6 rounded shadow-md bg-[#0f1720]"
            style={{ border: "1px solid rgba(255,255,255,0.03)" }}
          >
            <h2 className="text-xl text-white font-bold text-center">
              Sign Up
            </h2>

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
    </>
  );
}
