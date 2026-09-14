import { motion } from "framer-motion";
import Spinner from "./Spinner";

const VARIANT_CLASSES = {
  primary:
    "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-600 focus-visible:ring-indigo-400",
  secondary:
    "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus-visible:ring-slate-400",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300",
  danger:
    "bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700 focus-visible:ring-red-400",
};

/**
 * Shared button used across the app so every screen gets the same
 * variants, hover/tap motion and disabled/loading behaviour instead of
 * each screen re-implementing its own button styles.
 */
const Button = ({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={18} /> : children}
    </motion.button>
  );
};

export default Button;
