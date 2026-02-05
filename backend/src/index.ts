// src/index.ts
import express, { Request, Response, NextFunction } from "express";

import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from 'cors';
dotenv.config();

import { startRedis, redis } from "./lib/redis";
import authRoutes from "./routes/auth";
import apiRoutes from "./routes/api";

async function main() {
  await startRedis();
  const app = express();

  const allowedOrigins = [
    "http://localhost:4173",
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

  app.get("/health", async (_, res) => {
    try {
      await redis.ping(); 
      res.status(200).json({
        status: "ok",
        redis: "connected"
      });
    } catch (err) {
      console.error("Health check failed:", err);
      res.status(500).json({
        status: "error",
        redis: "disconnected"
      });
    }
  });

  app.use(express.json());
  app.use(cookieParser());

  app.use("/auth", authRoutes);
  app.use("/api", apiRoutes);

  // 404 handler (unknown routes)
  app.use((req, res, next) => {
    res.status(404).json({
      error: "Route not found",
      path: req.originalUrl,
    });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled error:", err);

    const status = err.status || err.statusCode || 500;

    res.status(status).json({
      error: err.message || "Internal Server Error",
    });
  });

  const PORT = process.env.PORT || "4000";
  app.listen(Number(PORT), () => console.log(`Server running on http://localhost:${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
