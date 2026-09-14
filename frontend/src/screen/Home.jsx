import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, Users, Loader2 } from "lucide-react";
import { UserContext } from "../context/UserContext";
import axios from "../config/axios";
import { getErrorMessage } from "../utils/messages";
import Navbar from "../components/Navbar";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";

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

      <main className="mx-auto max-w-6xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Projects</h1>
            <p className="mt-1 text-sm text-slate-500">
              {user?.email ? `Signed in as ${user.email}` : "Pick up where you left off"}
            </p>
          </div>
          <Button onClick={handleModalOpen}>
            <FolderPlus size={18} />
            New Project
          </Button>
        </div>

        {isLoadingProjects ? (
          <div className="flex items-center gap-2 py-12 text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <FolderPlus size={36} className="mb-3 text-slate-300" />
            <p className="font-medium text-slate-600">No projects yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Create your first project to start collaborating.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/project/${project._id}`, { state: { project } })}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <h2 className="truncate font-semibold text-slate-900 group-hover:text-indigo-600">
                  {project.name}
                </h2>
                <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                  <Users size={16} />
                  <span>
                    {project.users?.length ?? 0} collaborator
                    {project.users?.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
