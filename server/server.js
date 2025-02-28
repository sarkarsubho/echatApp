import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { corsOption } from "./constants/config.js";
import cors from "cors";
import { socketKeys } from "./constants/socketKeys.js";

const app = express();
const server = createServer(app);
const io = new Server(server, cors(corsOption));
app.use(express.json());
app.use(cors(corsOption));

const users = {};
app.set("io", io);
io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on(socketKeys.CONNECTION_ERROR, (err) => {
    console.error("Socket connection error:", err.message);
  });

  socket.on(socketKeys.USER_JOINED, ({ uuid, username }) => {
    if (!users[uuid]) {
      users[uuid] = { name: username, socketId: socket.id, online: true };
    } else {
      users[uuid].socketId = socket.id;
      users[uuid].online = true;
    }
    io.emit(socketKeys.UPDATE_USERS, users);
    console.log(
      `${username} joined with UUID: ${uuid} and Socket ID: ${socket.id}`
    );
  });

  socket.on(socketKeys.MESSAGE, ({ sender, receiver, message }) => {
    console.log(`Message from ${sender} to ${receiver}: ${message}`);
    const receiverSocketId = users[receiver]?.socketId;
    if (receiverSocketId) {
      io.to(receiverSocketId).emit(socketKeys.MESSAGE, { sender, message });
    }
  });

  socket.on(socketKeys.TYPING, ({ sender, receiver }) => {
    console.log(sender, "is typing");
    const receiverSocketId = users[receiver]?.socketId;
    if (receiverSocketId) {
      io.to(receiverSocketId).emit(socketKeys.TYPING, sender);
    }
  });

  socket.on(socketKeys.STOP_TYPING, ({ sender, receiver }) => {
    console.log(sender, "is stopped typing");

    const receiverSocketId = users[receiver]?.socketId;
    if (receiverSocketId) {
      io.to(receiverSocketId).emit(socketKeys.STOP_TYPING, sender);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    const user = Object.values(users).find(
      (user) => user.socketId === socket.id
    );
    if (user) {
      user.online = false;
    }
    io.emit(socketKeys.UPDATE_USERS, users);
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
