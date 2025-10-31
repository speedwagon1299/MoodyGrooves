import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = createClient({ url: REDIS_URL });
redis.on("error", (e) => console.error("Redis error", e));

export async function startRedis() {
  await redis.connect();
  console.log("Connected to Redis");
}