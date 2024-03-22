const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require("path");


const publicDirectoryPath = path.join(__dirname, "/views");

// Use express.static middleware to serve static files from the public directory
app.use(express.static(publicDirectoryPath));

// Serve index.html when the root URL is accessed
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, "index.html"));
});

app.get("/chat", (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, "chat.html"));
});

let pool = [];

io.on("connection", (socket) => {
  console.log("New user connected");

  io.emit("poolCount", pool.length);

  let tags = [];

  socket.on("tags", (tags) => {
    if (Array.isArray(tags)) {
      tags = tags;
    }
  });

  // Add the user to the pool
  pool.push({ socket, tags });

  // Try to pair users if there are at least two users in the pool
  if (pool.length >= 2) {
    const user1 = pool.shift();
    const user2 = pool.shift();

    // Create a unique room for the pair
    const roomName = `room-${Math.random().toString(36).substr(2, 5)}`;
    user1.socket.join(roomName);
    user2.socket.join(roomName);

    // Emit an event to start the chat session
    io.to(roomName).emit("startChat");

    console.log("Pairing users in room:", roomName);
  }

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
    // Remove the user from the pool
    pool = pool.filter((user) => user !== socket);
  });

  socket.on("chat message", (msg) => {
    const rooms = io.sockets.adapter.rooms;
    let roomName;
    for (const [key, value] of rooms.entries()) {
      if (value.size > 1 && value.has(socket.id)) {
        console.log(key, value);
        roomName = key;
        if (roomName) {
          io.to(roomName).emit("chat message", {
            type: msg.type,
            content: msg.content,
            senderId: socket.id,
          });
        }
        break;
      }
    }
  });
});

server.listen(8080, () => {
  console.log("listening on *:8080");
});
