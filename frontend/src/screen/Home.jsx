import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileCode2, FolderGit2, FolderPlus, Users } from "lucide-react";
import { UserContext } from "../context/UserContext";
import axios from "../config/axios";
import { getErrorMessage } from "../utils/messages";
import Navbar from "../components/Navbar";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import ProjectCard from "../components/home/ProjectCard";
import GettingStarted from "../components/home/GettingStarted";
import { listFilePaths } from "../utils/fileTree";

const Home = () => {
  const { user } = useContext(UserContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const navigate = useNavigate();

  const handleModalOpen = () => setIsModalOpen(true);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCreateError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsCreating(true);
    setCreateError("");

    axios
      .post("/projects/create", { name: projectName })
      .then((res) => {
        // Fix: append the new project instead of leaving the list stale
        // until the next full reload.
        setProjects((prev) => [...prev, res.data.project ?? res.data]);
        setProjectName("");
        setIsModalOpen(false);
      })
      .catch((err) => {
        setCreateError(getErrorMessage(err, "Could not create project."));
      })
      .finally(() => setIsCreating(false));
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    return hour < 18 ? "Good afternoon" : "Good evening";
  }, []);

  // Headline numbers for the hero: projects, the people you share them
  // with, and how much code is in them.
  const stats = useMemo(() => {
    const collaborators = new Set();
    let files = 0;
    for (const project of projects) {
      files += listFilePaths(project.fileTree).length;
      for (const member of project.users ?? []) {
        const email = member?.email ?? member;
        if (email && email !== user?.email) collaborators.add(String(email));
      }
    }
    return [
      { label: "Projects", value: projects.length, icon: FolderGit2 },
      { label: "Collaborators", value: collaborators.size, icon: Users },
      { label: "Files", value: files, icon: FileCode2 },
    ];
  }, [projects, user?.email]);

  useEffect(() => {
    axios
      .get("/projects/all")
      .then((res) => setProjects(res.data))
      .catch((err) => console.error("Error fetching projects:", err))
      .finally(() => setIsLoadingProjects(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6 sm:p-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6 text-white shadow-xl sm:p-8">
          {/* Soft glow, purely decorative. */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-indigo-200">{greeting}</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
                {user?.email?.split("@")[0] ?? "Welcome"}
              </h1>
              <p className="mt-2 max-w-md text-sm text-indigo-100/80">
                Create a project, build it with the AI in the chat, and run it right here in your
                browser.
              </p>
            </div>
            <Button onClick={handleModalOpen} className="shrink-0 shadow-lg shadow-indigo-900/30">
              <FolderPlus size={18} />
              New Project
            </Button>
          </div>

          <dl className="relative mt-7 grid grid-cols-3 gap-3 sm:max-w-md">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <dt className="flex items-center gap-1.5 text-xs text-indigo-200">
                  <Icon size={14} />
                  {label}
                </dt>
                <dd className="mt-1 text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Your Projects</h2>
          {projects.length > 0 && (
            <span className="text-sm text-slate-400">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {isLoadingProjects ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((placeholder) => (
              <div
                key={placeholder}
                className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-14 text-center">
            <FolderPlus size={36} className="mb-3 text-slate-300" />
            <p className="font-medium text-slate-600">No projects yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Create your first project to start building with the AI and your team.
            </p>
            <Button onClick={handleModalOpen} className="mt-4 !py-2">
              <FolderPlus size={16} />
              New Project
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onOpen={(selected) =>
                  navigate(`/project/${selected._id}`, { state: { project: selected } })
                }
              />
            ))}
          </div>
        )}

        <GettingStarted />
      </main>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleModalClose}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Create a New Project</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <label
                htmlFor="projectName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Project Name
              </label>
              <TextField
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/30"
                autoFocus
                required
              />
              {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={handleModalClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={isCreating}>
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
