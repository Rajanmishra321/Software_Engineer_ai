/**
 * Creates two demo accounts that share a project, with some files and chat
 * history, so the app can be tried out with real collaborators.
 *
 * Run from the backend folder:  node scripts/seedDemo.js
 * Safe to re-run: it updates the same demo accounts and project instead of
 * creating duplicates, and never touches other data.
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Project from "../models/projectModel.js";
import Message from "../models/messageModel.js";

const DEMO_PASSWORD = "Demo@1234";
const DEMO_USERS = [
  { email: "demo.one@soen.dev" },
  { email: "demo.two@soen.dev" },
];
// Project names are stored lowercase and must be unique.
const PROJECT_NAME = "demo workspace";

const FILE_TREE = {
  "package.json": {
    file: {
      contents: JSON.stringify(
        {
          name: "demo-workspace",
          version: "1.0.0",
          type: "module",
          scripts: { start: "node index.js" },
          dependencies: { express: "^4.21.2" },
        },
        null,
        2
      ),
    },
  },
  "index.js": {
    file: {
      contents: `import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>Hello from the demo workspace!</h1>');
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
    },
  },
  src: {
    directory: {
      "greet.js": {
        file: {
          contents: `// Edit me, then press Run to start the server.
export const greet = (name) => \`Hello, \${name}!\`;
`,
        },
      },
    },
  },
};

const CHAT = [
  { from: 0, message: "Hey! I've pushed the starter express server to the project." },
  { from: 1, message: "Nice, I can see index.js in the explorer. I'll add the routes next." },
  { from: 0, message: "Sounds good. Try @ai if you want it to scaffold anything." },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const password = await User.hashPassword(DEMO_PASSWORD);
  const users = await Promise.all(
    DEMO_USERS.map(({ email }) =>
      User.findOneAndUpdate({ email }, { email, password }, { upsert: true, new: true })
    )
  );
  const userIds = users.map((user) => user._id);

  const project = await Project.findOneAndUpdate(
    { name: PROJECT_NAME },
    { name: PROJECT_NAME, users: userIds, fileTree: FILE_TREE },
    { upsert: true, new: true }
  );

  // Replace the demo chat so re-running doesn't stack duplicates.
  await Message.deleteMany({ project: project._id });
  // Space the timestamps a minute apart so the conversation reads in order.
  const chatStart = Date.now() - CHAT.length * 60_000;
  await Message.create(
    CHAT.map(({ from, message }, index) => ({
      project: project._id,
      sender: { email: users[from].email },
      message,
      createdAt: new Date(chatStart + index * 60_000),
    }))
  );

  console.log("Demo data ready\n");
  console.log(`Project: ${project.name} (${project._id})`);
  console.log(`Files:   ${Object.keys(FILE_TREE).join(", ")}`);
  console.log(`Chat:    ${CHAT.length} messages\n`);
  console.log("Log in with either account (same password):");
  for (const user of users) console.log(`  ${user.email} / ${DEMO_PASSWORD}`);

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error("Seeding failed:", error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
