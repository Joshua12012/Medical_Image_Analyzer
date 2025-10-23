// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import path from "path";

// console.log("Current working directory:", process.cwd());
// console.log("Resolved .env path:", path.resolve(process.cwd(), "../.env"));

// dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

// const MONGO_URI = process.env.MONGO_URI;

// if (!MONGO_URI) {
//   console.log("MOWUERBOWIRCOIWBRVO");
// }

// mongoose
//   .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log("MongoDB connected"))
//   .catch((err) => console.log("MongoDB connection error", err));
// src / config / db.js;
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Use absolute path based on __dirname
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env explicitly from backend folder
dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing! Check .env file location");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));
