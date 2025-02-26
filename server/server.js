import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { corsOption } from "./constants/config.js";
import cors from "cors";

const app = express();
const server = createServer(app);
const io = new Server(server,cors(corsOption));

// app.set("io", io);

app.use(express.json());
app.use(cors(corsOption));

const users = {}; 

io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  socket.on("user-joined", ({ uuid, username }) => {
    if (!users[uuid]) {
      users[uuid] = { name: username, socketId: socket.id, online: true };
    } else {
      users[uuid].socketId = socket.id;
      users[uuid].online = true;
    }
    io.emit("update-users", users);
    console.log(`${username} joined with UUID: ${uuid} and Socket ID: ${socket.id}`);
  });

  socket.on("message", ({ sender, receiver, message }) => {
    console.log(`Message from ${sender} to ${receiver}: ${message}`);
    const receiverSocketId = users[receiver]?.socketId;
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message", { sender, message });
    }
  });

  socket.on("typing", ({ sender, receiver }) => {
    const receiverSocketId = users[receiver]?.socketId;
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", sender);
    }
  });

  socket.on("stop-typing", ({ sender, receiver }) => {
    const receiverSocketId = users[receiver]?.socketId;
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stop-typing", sender);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    const user = Object.values(users).find((user) => user.socketId === socket.id);
    if (user) {
      user.online = false;
    }
    io.emit("update-users", users);
  });
});


app.get("/", (req, res) => {
    res.send(
      `<h1 style="color:green; text-align:center">welcome to echat Api</h1>`
    );
  });

server.listen(8080, () => {
  try {
    console.log("server is up and running");
  } catch (error) {
    console.log("server error", error);
  }
});
