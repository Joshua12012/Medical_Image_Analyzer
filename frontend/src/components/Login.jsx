

import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/fireBaseConfig";
import ElectricBorder from "./ElectricBorder";
import Particles from "./Particles"; // Make sure this path is correct!
import TextType from "./TextType";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/App");
    } catch (err) {
      setError("Invalid credentials or user not found");
    }
  };

  return (
    <>
      {/* PURE BLACK BACKGROUND + WHITE COSMIC PARTICLES */}
      <div className="fixed inset-0 -z-10 bg-black">
        <Particles
          particleColors={["#ffffff", "#ffffff"]} // 100% pure white only
          particleCount={400} // Lots of stars!
          particleSpread={15} // Wider spread = deeper space feel
          speed={0.5} // Gentle but visible movement
          particleBaseSize={80} // Smaller = more stars, not giant blobs
          moveParticlesOnHover={true} // Cool interaction
          alphaParticles={true} // Fade at edges = depth
          disableRotation={true} // No spinning, just floating dots
        />
      </div>

      {/* MAIN CONTENT - centered login card */}
      <div className="min-h-screen flex flex-col items-center justify-center relative z-10">
        {/* Animated heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            <TextType
              text={[
                "Welcome back!",
                "Log in to your Account",
                "Automate with AI",
              ]}
              typingSpeed={75}
              pauseDuration={1500}
              showCursor={true}
              cursorCharacter="|"
            />
          </h1>
        </div>

        {/* Login Form with Electric Border */}
        <ElectricBorder
          color="#7df9ff"
          speed={1.2}
          chaos={0.15}
          thickness={4}
          style={{ borderRadius: 20 }}
        >
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-3 w-72 p-6 rounded shadow-md bg-[#0f1720]"
            style={{ border: "1px solid rgba(255,255,255,0.03)" , borderRadius:"24px"}}
          >
            <h2 className="text-xl text-white font-bold text-center">Login</h2>

            {error && <p className="text-red-500 text-center mb-3">{error}</p>}

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
              Login
            </button>

            <p className="text-white text-center mt-4">
              Don’t have an account?{" "}
              <span
                onClick={() => navigate("/signup")}
                className="text-blue-600 cursor-pointer hover:underline"
              >
                Sign up
              </span>
            </p>
          </form>
        </ElectricBorder>
      </div>
    </>
  );
}
