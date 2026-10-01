import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

// Shared color classes for TextField inputs on the dark auth screens
// (Login/Register). TextField itself carries no color so a light-theme
// screen and a dark-theme screen never fight over which color wins; this
// is the one definition of "what a dark-theme input looks like" so Login
// and Register don't each redeclare the same class string.
export const AUTH_INPUT_CLASSES =
  "border-slate-700 bg-slate-900/80 text-white placeholder-slate-500 focus:border-indigo-400 focus:ring-indigo-500/40";
export const AUTH_INPUT_ICON_CLASSES = "text-indigo-400";

// Fixed particle positions/delays so the background doesn't reshuffle on
// every re-render (Math.random() in render previously caused that).
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  top: `${(i * 37) % 100}%`,
  left: `${(i * 53) % 100}%`,
  size: 14 + ((i * 7) % 18),
  duration: 8 + ((i * 3) % 6),
  delay: (i % 5) * 0.6,
}));

const FloatingParticles = () => (
  <div className="pointer-events-none absolute inset-0 opacity-30">
    {PARTICLES.map((p) => (
      <motion.div
        key={p.id}
        className="absolute"
        style={{ top: p.top, left: p.left }}
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: [0, -40, 0], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles size={p.size} className="text-indigo-400" />
      </motion.div>
    ))}
  </div>
);

/**
 * Shared visual shell for the Login and Register screens: gradient
 * background, floating sparkles and the glassy centered card. Keeping this
 * in one place means both auth screens always look and feel consistent.
 */
const AuthLayout = ({ icon: Icon, title, subtitle, children, footer, aside }) => (
  <motion.div
    className={`relative flex min-h-screen items-center justify-center gap-10 overflow-hidden bg-gradient-to-br from-slate-950 via-[#0F172A] to-[#1E1B4B] p-6 ${
      aside ? "flex-col lg:flex-row lg:items-center" : ""
    }`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  >
    <FloatingParticles />

    {aside && (
      <motion.div
        className="relative w-full max-w-lg pt-6 lg:pt-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {aside}
      </motion.div>
    )}

    <motion.div
      className="relative w-full max-w-md shrink-0 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-lg"
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-center"
      >
        {Icon && (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30">
            <Icon className="text-white" size={26} />
          </div>
        )}
        <h1 className="text-3xl font-extrabold text-white">{title}</h1>
        {subtitle && <p className="mt-2 text-indigo-300">{subtitle}</p>}
      </motion.div>

      <div className="mt-6">{children}</div>

      {footer && <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>}
    </motion.div>
  </motion.div>
);

export default AuthLayout;
