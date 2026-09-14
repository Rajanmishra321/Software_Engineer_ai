import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../config/axios";
import { getErrorMessage } from "../utils/messages";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";
import { UserContext } from "../context/UserContext";
import AuthLayout, { AUTH_INPUT_CLASSES, AUTH_INPUT_ICON_CLASSES } from "../components/AuthLayout";
import TextField from "../components/ui/TextField";
import Button from "../components/ui/Button";
import ErrorBanner from "../components/ui/ErrorBanner";

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
        localStorage.setItem("Token", res.data.user.token);
        setUser(res.data.user);
        navigate("/");
      })
      .catch((err) => {
        setError(getErrorMessage(err, "Login failed. Please try again."));
        setIsLoading(false);
      });
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome Back"
      subtitle="Sign in to your creative space"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-semibold text-indigo-300 hover:text-indigo-200">
            Create one
          </Link>
        </>
      }
    >
      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <TextField
          icon={Mail}
          iconClassName={AUTH_INPUT_ICON_CLASSES}
          className={AUTH_INPUT_CLASSES}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          autoComplete="email"
          required
        />

        <TextField
          icon={Lock}
          iconClassName={AUTH_INPUT_ICON_CLASSES}
          className={AUTH_INPUT_CLASSES}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-indigo-400 hover:text-indigo-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />

        <Button type="submit" loading={isLoading} className="w-full">
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
