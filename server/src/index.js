import http from "node:http";
import { Server } from "socket.io";
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = await createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.clientOrigin, credentials: true } });

app.set("io", io);

io.on("connection", (socket) => {
  socket.on("listing:join", (listingId) => socket.join(listingId));
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${config.port}`);
});
