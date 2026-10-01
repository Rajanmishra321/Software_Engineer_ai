import "dotenv/config";
import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Project from "./models/projectModel.js";
import User from "./models/userModel.js";
import { generateResult } from "./services/aiService.js";
import * as messageService from "./services/messageService.js";
import * as presence from "./utils/presence.js";
import { socketCorsOptions } from "./config/cors.js";
import { checkRateLimit } from "./utils/rateLimiter.js";

// Per-user cap on AI requests (generous for real use, enough to stop abuse).
const AI_RATE_LIMIT = { limit: 10, windowMs: 5 * 60_000 };

// Payload keys the editor uses to keep collaborators' files in step.
const EDITOR_SYNC_KEYS = ['fileUpdate', 'fileOp'];
const isEditorSync = (message) =>
  EDITOR_SYNC_KEYS.some((key) => message.startsWith(`{"${key}"`));

const server = http.createServer(app);

const io = new Server(server, { cors: socketCorsOptions });


io.use(async (socket, next) => {
  try {
    // Get token from auth object or Authorization header
    const token = socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization ?
        socket.handshake.headers.authorization.split(" ")[1] : null);

    const projectId = socket.handshake.query.projectId;

    if (!projectId) {
      return next(new Error("Authentication failed: No projectId provided"));
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new Error("Authentication failed: Invalid projectId"));
    }


    socket.project = await Project.findById(projectId);

    // Without this, the connection handler crashed reading `_id` of null.
    if (!socket.project) {
      return next(new Error("Authentication failed: Project not found"));
    }

    if (!token) {
      return next(new Error("Authentication failed: No token provided"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (!decoded) {
      return next(new Error("Authentication failed: Invalid token"));
    }

    // Only collaborators may join a project's room: without this check any
    // signed-in user could read its chat and edit its files.
    const user = await User.findOne({ email: decoded.email });
    const isMember = user && socket.project.users.some((memberId) => memberId.equals(user._id));

    if (!isMember) {
      return next(new Error("Authentication failed: Not a collaborator on this project"));
    }

    // Attach user info to socket for later use
    socket.user = decoded;

    // Important: Must call next() on successful authentication
    next();
  } catch (error) {
    console.log("Socket authentication error:", error.message);
    return next(new Error("Authentication failed: " + error.message));
  }
});

io.on("connection", (socket) => {
  console.log(`Client connected: - User: ${socket.user?.email || socket.user?.id || "Unknown"}`);
  socket.roomId = socket.project._id.toString();
  // console.log(socket.project._id.toString())

  socket.join(socket.roomId);

  // Let everyone in the project see who is here and which file they have
  // open, so two people notice when they are in the same file.
  const broadcastPresence = () => {
    io.to(socket.roomId).emit("presence", presence.list(socket.roomId));
  };

  presence.join(socket.roomId, socket.id, socket.user?.email);
  broadcastPresence();

  socket.on("presence", (data) => {
    presence.setFile(socket.roomId, socket.id, data?.file);
    broadcastPresence();
  });

  // Recipients report which messages they received ("delivered") and which
  // they actually saw ("read"); senders get the ticks for their messages.
  socket.on("message-status", async ({ ids, status } = {}) => {
    const email = socket.user?.email;
    if (!email) return;

    try {
      await messageService.markMessages({ projectId: socket.roomId, ids, email, status });
      io.to(socket.roomId).emit("message-status", { ids, status, email });
    } catch (error) {
      console.log("Error updating message status:", error.message);
    }
  });

  // Chat is stored so history survives a reload and messages sent while a
  // collaborator was away are still there when they come back. File-sync
  // payloads are editor plumbing, not chat, so they are never stored.
  const saveMessage = async (sender, message) => {
    try {
      const saved = await messageService.createMessage({ projectId: socket.roomId, sender, message })
      return saved._id.toString()
    } catch (error) {
      console.log("Error saving chat message:", error.message)
      return null
    }
  }

  // `ack` lets the sender's client show a "sent" tick once the message is
  // stored, and the id travels with the message so recipients can report
  // back when they receive and read it.
  socket.on('project-message', async (data, ack) => {
    const message = data?.message
    if (typeof message !== 'string') return

    // Editor sync traffic (file contents, renames, deletes) is JSON and may
    // contain "@ai" inside file contents; only real chat text is stored or
    // sent to the AI.
    if (isEditorSync(message)) {
      socket.broadcast.to(socket.roomId).emit('project-message', data)
      return
    }

    const id = await saveMessage(data.sender ?? socket.user, message)
    socket.broadcast.to(socket.roomId).emit('project-message', { ...data, id })
    ack?.({ id })

    if (!message.includes('@ai')) return

    // Generating a project is slow and costs AI quota, so cap how often one
    // person can ask - a public demo would otherwise exhaust it.
    const aiLimit = checkRateLimit(`ai:${socket.user?.email}`, AI_RATE_LIMIT)
    if (!aiLimit.allowed) {
      io.to(socket.id).emit('project-message', {
        message: JSON.stringify({
          text: `You've sent a lot of AI requests. Please wait ${aiLimit.retryAfterSeconds}s and try again.`
        }),
        sender: { name: "AI", email: "SOEN" }
      })
      return
    }

    const emitAiMessage = async (payload) => {
      const sender = { name: "AI", email: "SOEN" }
      const aiId = await saveMessage(sender, payload)
      io.to(socket.roomId).emit('project-message', { message: payload, sender, id: aiId })
    }

    try {
      const result = await generateResult(message.replace('@ai', ''))
      await emitAiMessage(result)
    } catch (error) {
      // An unhandled rejection here used to crash the whole server.
      console.log("AI generation error:", error.message)
      const isBusy = error.status === 429 || error.status === 503
      await emitAiMessage(JSON.stringify({
        text: isBusy
          ? "The AI service is busy right now. Please try again in a few seconds."
          : "Sorry, I couldn't generate a response right now. Please try again in a moment."
      }))
    }
  })


  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Client disconnected:`);
    presence.leave(socket.roomId, socket.id);
    socket.leave(socket.roomId);
    broadcastPresence();
  });

  // Send welcome message to confirm connection
  socket.emit("welcome", { message: "Successfully connected to server" });
});

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`server is running on ${port}`);
});
