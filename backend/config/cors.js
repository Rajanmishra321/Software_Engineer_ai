/**
 * Which origins may call this API.
 *
 * Set CLIENT_URL in .env to your deployed frontend (comma-separated for
 * several, e.g. a preview domain). When it isn't set - local development -
 * every origin is allowed, which keeps `npm run dev` working as before.
 */
const allowedOrigins = (process.env.CLIENT_URL ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const isOriginAllowed = (origin) => {
  // No allowlist configured, or a non-browser client (curl, server-to-server).
  if (allowedOrigins.length === 0 || !origin) return true;
  return allowedOrigins.includes(origin.replace(/\/$/, ""));
};

/** Options for the `cors` middleware. */
export const corsOptions = {
  origin: (origin, callback) =>
    isOriginAllowed(origin) ? callback(null, true) : callback(new Error("Not allowed by CORS")),
  credentials: true,
};

/** Matching options for Socket.IO's own CORS handling. */
export const socketCorsOptions = {
  origin: (origin, callback) =>
    isOriginAllowed(origin) ? callback(null, true) : callback(new Error("Not allowed by CORS")),
  credentials: true,
};
