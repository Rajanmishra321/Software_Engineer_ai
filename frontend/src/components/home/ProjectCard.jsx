import { ArrowRight } from "lucide-react";
import Avatar from "../ui/Avatar";
import { listFilePaths } from "../../utils/fileTree";
import { formatRelativeTime } from "../../utils/time";

const MAX_AVATARS = 3;

/** One project in the list, with its collaborators and size at a glance. */
const ProjectCard = ({ project, onOpen }) => {
  const collaborators = (project.users ?? []).filter((user) => user?.email);
  const fileCount = listFilePaths(project.fileTree).length;
  const updated = formatRelativeTime(project.updatedAt);

  return (
    <button
      type="button"
      onClick={() => onOpen(project)}
      className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20">
          <i className="ri-folder-3-fill text-lg"></i>
        </div>
        <div className="min-w-0 flex-grow">
          <h2 className="truncate font-semibold text-slate-900 group-hover:text-indigo-600">
            {project.name}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {fileCount > 0 ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : "No files yet"}
            {updated && ` · updated ${updated}`}
          </p>
        </div>
        <ArrowRight
          size={18}
          className="mt-1 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500"
        />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center -space-x-2">
          {collaborators.slice(0, MAX_AVATARS).map((user) => (
            <Avatar key={user._id} email={user.email} size="sm" className="ring-2 ring-white" />
          ))}
          {collaborators.length > MAX_AVATARS && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
              +{collaborators.length - MAX_AVATARS}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {collaborators.length || project.users?.length || 1} collaborator
          {(collaborators.length || project.users?.length || 1) === 1 ? "" : "s"}
        </span>
      </div>
    </button>
  );
};

export default ProjectCard;
