/** Round placeholder avatar used wherever a user is listed. */
const Avatar = ({ className = "" }) => (
  <div
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white ${className}`}
  >
    <i className="ri-user-fill"></i>
  </div>
);

export default Avatar;
