import { Redis } from "ioredis";

/**
 * Redis is used only to blacklist tokens on logout, so it is optional: when
 * it isn't configured the app still runs and tokens simply expire on their
 * own (24h). That keeps local setup and free hosting simple.
 *
 * Configure it either way:
 *   REDIS_URL=rediss://default:password@host:6379   (managed providers)
 *   REDIS_HOST / REDIS_PORT / REDIS_PASSWORD        (local or classic setup)
 */
const { REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;

const createClient = () => {
    if (REDIS_URL) {
        // rediss:// URLs carry TLS, which managed providers require.
        return new Redis(REDIS_URL);
    }

    if (!REDIS_HOST) return null;

    return new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT ? Number(REDIS_PORT) : 6379,
        password: REDIS_PASSWORD || undefined,
        // Managed Redis is usually TLS; localhost usually isn't.
        tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    });
};

const redisClient = createClient();

if (redisClient) {
    redisClient.on("connect", () => {
        console.log("Connected to Redis");
    });

    // Was 'err0r', so connection problems were never reported.
    redisClient.on("error", (err) => {
        console.log("Redis connection error:", err.message);
    });
} else {
    console.log("Redis not configured - logout will rely on token expiry");
}

/**
 * Same surface as an ioredis client, minus the crash when Redis is absent.
 * `get` reports nothing blacklisted; `set` quietly does nothing.
 */
export default {
    get: async (key) => (redisClient ? redisClient.get(key) : null),
    set: async (...args) => (redisClient ? redisClient.set(...args) : "OK"),
};
