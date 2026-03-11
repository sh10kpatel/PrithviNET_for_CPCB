import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

export let io: Server;

export function initSocket(httpServer: HTTPServer): void {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:3000" },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}
