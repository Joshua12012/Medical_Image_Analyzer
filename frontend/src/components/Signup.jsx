import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase/fireBaseConfig";

export default function Signup({ onSignupSuccess }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      onSignupSuccess?.(userCredential.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSignup} className="flex flex-col gap-3 w-72 mx-auto mt-10">
      <h2 className="text-xl font-bold text-center">Sign Up</h2>
      <input type="text" placeholder="Username" value={username}
        onChange={(e) => setUsername(e.target.value)} className="border p-2 rounded" required />
      <input type="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} className="border p-2 rounded" required />
      <input type="password" placeholder="Password" value={password}
        onChange={(e) => setPassword(e.target.value)} className="border p-2 rounded" required />
      <button type="submit" className="bg-blue-600 text-black py-2 rounded">Create Account</button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
