// src/index.ts
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

import { startRedis } from "./lib/redis";
import authRoutes from "./routes/auth";
import apiRoutes from "./routes/api";

async function main() {
  await startRedis();
  const app = express();
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
