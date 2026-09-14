import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, LogOut } from "lucide-react";
import axios from "../config/axios";
import { UserContext } from "../context/UserContext";
import Button from "./ui/Button";

/**
 * App-wide top bar: branding, the signed-in user's email and Logout.
 * Logout calls the backend so the token is blacklisted server-side
 * (see backend/middlewares/authMiddleware.js) and only then clears local
 * state, instead of only forgetting the token on the client.
 */
const Navbar = () => {
  const { user, logout } = useContext(UserContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await axios.get("/users/logout");
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      logout();
      setIsLoggingOut(false);
      navigate("/login");
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
          <Code2 size={18} />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900">SOEN</span>
      </div>

      <div className="flex items-center gap-4">
        {user?.email && (
          <span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span>
        )}
        <Button
          variant="secondary"
          onClick={handleLogout}
          loading={isLoggingOut}
          className="!px-4 !py-2 text-sm"
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
