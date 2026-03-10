// server.ts (root level — run with: node server.js or tsx server.ts)
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { getSocketServer } from "./src/lib/socket-server";
import { registerSocketHandlers } from "./src/lib/socket-handlers";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO
  const io = getSocketServer(httpServer);
  if (io) {
    registerSocketHandlers(io);
    console.log("✅ Socket.IO initialized");
  }

  httpServer.listen(port, hostname, () => {
    console.log(`✅ Server ready on http://${hostname}:${port}`);
    console.log(`   Mode: ${dev ? "development" : "production"}`);
  });
});
