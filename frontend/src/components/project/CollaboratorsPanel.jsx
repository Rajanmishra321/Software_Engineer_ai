import Avatar from "../ui/Avatar";

/** Slide-over list of the project's collaborators inside the left panel. */
const CollaboratorsPanel = ({ isOpen, users = [], presence = [], onClose, onAddClick }) => (
  <div
    className={`absolute inset-0 z-10 flex flex-col bg-white transition-transform duration-300 ${
      isOpen ? "translate-x-0" : "-translate-x-full"
    }`}
  >
    <header className="flex items-center justify-between border-b border-slate-200 p-2 px-3 shadow-sm">
      <button
        onClick={onAddClick}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-700 transition-colors hover:bg-slate-100"
      >
        <i className="ri-user-add-line"></i>
        <span className="text-sm font-medium">Add Collaborator</span>
      </button>
      <button
        onClick={onClose}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        title="Close"
      >
        <i className="ri-close-fill"></i>
      </button>
    </header>

    <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
      Collaborators ({users.length})
    </p>
    <div className="scrollbar-none flex flex-col gap-1 overflow-y-auto px-2">
      {users.map((member) => {
        const online = presence.find((entry) => entry.email === member.email);
        return (
          <div key={member._id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
            <div className="relative">
              <Avatar email={member.email} />
              {online && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                  title="Online"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{member.email}</p>
              <p className="truncate text-xs text-slate-400">
                {online
                  ? online.file
                    ? `Editing ${online.file.split("/").pop()}`
                    : "Online"
                  : "Offline"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default CollaboratorsPanel;
