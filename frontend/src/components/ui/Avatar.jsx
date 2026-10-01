import { getUserColor, getUserInitial } from "../../utils/users";

const SIZES = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-9 w-9 text-sm",
};

/**
 * Round avatar for a user. With an email it shows their initial in a colour
 * that stays the same for that person everywhere in the app.
 */
const Avatar = ({ email, size = "md", className = "", title }) => (
  <div
    title={title ?? email}
    className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
      SIZES[size]
    } ${email ? getUserColor(email) : "bg-indigo-500"} ${className}`}
  >
    {email ? getUserInitial(email) : <i className="ri-user-fill" />}
  </div>
);

export default Avatar;
