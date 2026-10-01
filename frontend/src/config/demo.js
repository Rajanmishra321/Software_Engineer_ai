/**
 * Public demo accounts and the short project pitch shown on the login
 * screen, so anyone opening the app can get straight in and understand
 * what it does.
 *
 * The accounts are created by `backend/scripts/seedDemo.js` - keep the
 * credentials here in step with that script.
 *
 * Set VITE_SHOW_DEMO_LOGIN=false in frontend/.env to hide this section
 * (e.g. for a deployment that shouldn't advertise shared logins).
 */
export const SHOW_DEMO_LOGIN = import.meta.env.VITE_SHOW_DEMO_LOGIN !== "false";

export const DEMO_PASSWORD = "Demo@1234";

export const DEMO_ACCOUNTS = [
  { email: "demo.one@soen.dev", label: "Demo user 1" },
  { email: "demo.two@soen.dev", label: "Demo user 2" },
];

export const DEMO_HINT =
  "Both accounts share the demo workspace. Open the second one in a private window to watch live collaboration.";

/** What the project does, for a first-time visitor. */
export const PROJECT_NAME = "SOEN";
export const PROJECT_TAGLINE = "Build software together, with an AI pair programmer in the chat.";

export const PROJECT_HIGHLIGHTS = [
  {
    icon: "ri-robot-2-line",
    title: "AI that writes the project",
    description: 'Type "@ai create an express server" and the generated files open in the editor.',
  },
  {
    icon: "ri-team-line",
    title: "Real-time collaboration",
    description: "Shared chat and code, with read receipts and who-is-editing-what presence.",
  },
  {
    icon: "ri-terminal-box-line",
    title: "Runs in the browser",
    description: "Install dependencies and start the app in a WebContainer, with a live preview.",
  },
];

export const PROJECT_STACK = ["React", "Tailwind", "Node & Express", "Socket.IO", "MongoDB", "Redis", "Gemini"];
