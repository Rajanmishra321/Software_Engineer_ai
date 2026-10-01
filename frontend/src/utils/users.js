/**
 * Stable per-user colour and initial, so the same collaborator is always
 * recognisable wherever they appear (avatars, file presence dots).
 */
const COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-fuchsia-500",
  "bg-lime-600",
  "bg-cyan-500",
  "bg-red-500",
];

export const getUserColor = (email = "") => {
  // djb2: similar addresses (demo.one / demo.two) still get different
  // colours, which a plain character sum often fails to do.
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) + hash + email.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

export const getUserInitial = (email = "") => email.trim().charAt(0).toUpperCase() || "?";
