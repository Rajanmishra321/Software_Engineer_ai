import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../config/axios";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle, Mail, Lock, Sparkles } from "lucide-react";
import { UserContext } from "../context/UserContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    axios
      .post("/users/login", { email, password })
      .then((res) => {
        // Fix: Use consistent case for token storage
        localStorage.setItem("Token", res.data.user.token);
        setUser(res.data.user);
        navigate("/");
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Login failed. Please try again.");
        setIsLoading(false);
      });
  };

  // Fix: Separate toggle function for password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      {/* Animated Particles */}
      <motion.div className="absolute inset-0 opacity-30">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [0, -40, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 8 + Math.random() * 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={16 + Math.random() * 16} className="text-indigo-400" />
          </motion.div>
        ))}
      </motion.div>

      {/* Login Card */}
      <motion.div
        className="w-full max-w-md  backdrop-blur-lg border border-white/20 shadow-2xl rounded-3xl p-8 relative"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h2 className="text-4xl font-extrabold text-white text-center">Welcome Back</h2>
          <p className="text-indigo-300 text-center mt-2">Sign in to your creative space</p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-red-500/20 text-red-200 border border-red-400 px-4 py-2 rounded-xl flex items-center mt-4"
            >
              <AlertCircle className="mr-3" size={20} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Email Input */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-gray-900 text-white border border-gray-700 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all placeholder-gray-400"
              placeholder="Email Address"
              required
            />
          </motion.div>

          {/* Password Input */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-gray-900 text-white border border-gray-700 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all placeholder-gray-400"
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-400 hover:text-indigo-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-3 rounded-xl flex items-center justify-center shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Login;