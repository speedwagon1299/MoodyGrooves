// src/index.ts
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from 'cors';
dotenv.config();

import { startRedis } from "./lib/redis";
import authRoutes from "./routes/auth";
import apiRoutes from "./routes/api";

async function main() {
  await startRedis();
  const app = express();
  console.log(process.env.NGROK_TUNNEL);
  const allowedOrigins = [
    "http://localhost:5173",
    process.env.NGROK_TUNNEL
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  app.use("/auth", authRoutes);
  app.use("/api", apiRoutes);

  const PORT = process.env.PORT || "4000";
  app.listen(Number(PORT), () => console.log(`Server running on http://localhost:${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
