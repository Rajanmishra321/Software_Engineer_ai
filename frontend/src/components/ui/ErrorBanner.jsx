import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

/**
 * Collapsible inline error message shown above auth forms. Extracted so
 * Login and Register don't each hand-roll the same alert box.
 */
const ErrorBanner = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="mt-4 flex items-center overflow-hidden rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-red-200"
      >
        <AlertCircle className="mr-3 shrink-0" size={20} />
        <span className="text-sm">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ErrorBanner;
