/**
 * Chat messages travel over the socket as `{ message, sender }` where
 * `message` is either plain text or a JSON string (AI replies and file
 * updates). This normalises both into an object.
 */
export const parseMessage = (message) => {
  if (message && typeof message === "object") return message;
  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : { text: String(message) };
  } catch {
    return { text: String(message ?? "") };
  }
};

/** Sender email the backend uses for AI replies (see backend/server.js). */
export const AI_SENDER_EMAIL = "SOEN";

/**
 * Extracts a human-readable error from an axios error. The backend is not
 * consistent about the shape: it sends `{ message }`, `{ error }` or
 * express-validator's `{ errors: [{ msg }] }` depending on the route.
 */
export const getErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  return data?.message || data?.error || data?.errors?.[0]?.msg || fallback;
};
