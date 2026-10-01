/**
 * Small in-memory sliding-window rate limiter, used to stop a public demo
 * burning the AI quota or being brute-forced. No dependency and no shared
 * store: with a single backend instance that is enough.
 */
const buckets = new Map(); // key -> timestamps[]

/**
 * Returns { allowed, retryAfterSeconds } for `key`, allowing `limit`
 * attempts per `windowMs`.
 */
export const checkRateLimit = (key, { limit, windowMs }) => {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    const retryAfterSeconds = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
};

/**
 * Express middleware form. `key` builds the bucket id; it defaults to the
 * signed-in user or the client IP, but routes should narrow it further (for
 * login, per account) so one person can't lock out everyone sharing an IP.
 */
export const rateLimit = ({ limit, windowMs, message, key: makeKey }) => (req, res, next) => {
  const scope = makeKey ? makeKey(req) : (req.user?.email ?? req.ip);
  const { allowed, retryAfterSeconds } = checkRateLimit(`${req.baseUrl}${req.path}:${scope}`, {
    limit,
    windowMs,
  });

  if (allowed) return next();

  res.set("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    error: message ?? `Too many requests. Try again in ${retryAfterSeconds}s.`,
  });
};

// Periodically drop empty buckets so the map can't grow forever.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of buckets) {
    if (times.every((time) => now - time > CLEANUP_INTERVAL_MS)) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref();
