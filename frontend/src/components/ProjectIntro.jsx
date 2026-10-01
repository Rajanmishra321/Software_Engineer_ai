import { Code2 } from "lucide-react";
import {
  PROJECT_HIGHLIGHTS,
  PROJECT_NAME,
  PROJECT_STACK,
  PROJECT_TAGLINE,
} from "../config/demo";

/** What this app is, shown beside the login form for first-time visitors. */
const ProjectIntro = () => (
  <div className="text-slate-300">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
        <Code2 size={22} />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-white">{PROJECT_NAME}</h1>
    </div>

    <p className="mt-4 text-lg leading-snug text-slate-200">{PROJECT_TAGLINE}</p>

    <ul className="mt-7 space-y-4">
      {PROJECT_HIGHLIGHTS.map(({ icon, title, description }) => (
        <li key={title} className="flex gap-3">
          <i className={`${icon} mt-0.5 text-xl text-indigo-400`}></i>
          <div>
            <p className="font-semibold text-white">{title}</p>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
        </li>
      ))}
    </ul>

    <div className="mt-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Built with</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PROJECT_STACK.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default ProjectIntro;
