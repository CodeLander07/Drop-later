import express from "express";
import * as dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db";
import notesRouter from "./routes/notes";
import healthRouter from "./routes/helth";
import authMiddleware from "./middleware/auth";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 })); // 60 req/min
app.use(authMiddleware);

// Routes
app.use("/api/notes", notesRouter);
app.use("/health", healthRouter);

app.listen("/", () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
// Start
connectDB().then(() => {
});
