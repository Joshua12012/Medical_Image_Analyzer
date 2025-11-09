import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/fireBaseConfig";
import ElectricBorder from "./ElectricBorder";
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
      navigate("/App"); // redirect to your main page after login
    } catch (err) {
      setError("Invalid credentials or user not found");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f13]">
      {/* Animated heading section */}

      <div className="text-center mb-6">
        <h1>
          <TextType
            text={[
              "Welcome back!",
              "Log in to your account",
              "Automate with AI",
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
          onSubmit={handleLogin}
          className="flex flex-col gap-3 w-72 p-6 rounded shadow-md bg-[#0f1720]"
          style={{ border: "1px solid rgba(255,255,255,0.03)" }}
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
  );
}
