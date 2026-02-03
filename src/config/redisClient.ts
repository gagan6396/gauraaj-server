import { createClient } from "redis";

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: 6379,
  },
});

redisClient.on("error", (error) => console.error("Redis Client Error", error));
redisClient.on("connect", () => console.log("Redis Client Connected"));
redisClient.on("ready", () => console.log("Redis Client Ready for Commands"));

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log("Redis Client Connected Successfully");
    } catch (error) {
      console.error("Could not connect to Redis", error);
    }
  }
};

export { connectRedis, redisClient };
