import http from "http";
import dotenv from "dotenv";

dotenv.config();

import { createApp } from "./app";
import { initSocket } from "./socket";
import { startCpcbPoller } from "./services/cpcbPoller";
import { initSimulator } from "./simulator/iotSimulator";

const PORT = parseInt(process.env.PORT || "4000", 10);

async function main(): Promise<void> {
  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize WebSocket
  initSocket(httpServer);

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`[PrithviNET API] Server running on http://localhost:${PORT}`);
    console.log(`[PrithviNET API] WebSocket ready`);
    console.log(`[PrithviNET API] Health check: http://localhost:${PORT}/api/health`);
  });

  // Start background services after server is listening
  try {
    startCpcbPoller();
    console.log("[PrithviNET API] CPCB poller started");
  } catch (err) {
    console.warn("[PrithviNET API] CPCB poller failed to start:", (err as Error).message);
  }

  try {
    await initSimulator();
    console.log("[PrithviNET API] IoT simulator started");
  } catch (err) {
    console.warn("[PrithviNET API] IoT simulator failed to start:", (err as Error).message);
  }
}

main().catch((err) => {
  console.error("[PrithviNET API] Fatal error:", err);
  process.exit(1);
});
