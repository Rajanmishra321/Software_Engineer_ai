import "dotenv/config";
import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Project from "./models/projectModel.js";
import { generateResult } from "./services/aiService.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    // methods: ["GET", "POST"],
    // allowedHeaders: ["my-custom-header"],
    // credentials: true
  }
});


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

  socket.on('project-message', async data => {
    const message = data?.message
    if (typeof message !== 'string') return

    socket.broadcast.to(socket.roomId).emit('project-message', data)

    // File-sync payloads are JSON and may contain "@ai" inside file contents;
    // only real chat text should trigger the AI.
    const isFileUpdate = message.startsWith('{"fileUpdate"')
    if (isFileUpdate || !message.includes('@ai')) return

    const emitAiMessage = (payload) => {
      io.to(socket.roomId).emit('project-message', {
        message: payload,
        sender: {
          name: "AI",
          email: "SOEN"
        }
      })
    }

    try {
      const result = await generateResult(message.replace('@ai', ''))
      emitAiMessage(result)
    } catch (error) {
      // An unhandled rejection here used to crash the whole server.
      console.log("AI generation error:", error.message)
      const isBusy = error.status === 429 || error.status === 503
      emitAiMessage(JSON.stringify({
        text: isBusy
          ? "The AI service is busy right now. Please try again in a few seconds."
          : "Sorry, I couldn't generate a response right now. Please try again in a moment."
      }))
    }
  })


  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Client disconnected:`);
    socket.leave(socket.roomId);
  });

  // Send welcome message to confirm connection
  socket.emit("welcome", { message: "Successfully connected to server" });
});

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`server is running on ${port}`);
});
