import "dotenv/config";
import http from "http";
import app from "./app.js";
import { Server } from "socket.io";

const server = http.createServer(app);

const io = new Server(server);
io.on("connection", (client) => {
  console.log("client connected");
  client.on("event", (data) => {
    /* … */
  });
  client.on("disconnect", () => {
    /* … */
  });
});

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`server is running on ${port}`);
});
