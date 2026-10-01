const STEPS = [
  {
    icon: "ri-folder-add-line",
    title: "Create a project",
    description: "Start fresh, or open one of your projects above.",
  },
  {
    icon: "ri-robot-2-line",
    title: "Ask the AI to build it",
    description: 'Send "@ai create an express server" in the project chat.',
  },
  {
    icon: "ri-user-add-line",
    title: "Invite collaborators",
    description: "Chat and edit code together, live.",
  },
  {
    icon: "ri-play-circle-line",
    title: "Press Run",
    description: "The app installs and starts in your browser, with a preview.",
  },
];

/** Short orientation for someone opening the app for the first time. */
const GettingStarted = () => (
  <section className="mt-8">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">How it works</h2>
    <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map(({ icon, title, description }, index) => (
        <li key={title} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-600">
              {index + 1}
            </span>
            <i className={`${icon} text-lg text-indigo-400`}></i>
          </div>
          <p className="mt-2 font-medium text-slate-800">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </li>
      ))}
    </ol>
  </section>
);

export default GettingStarted;
