const WebSocket = require("ws");
const express = require("express");

const app = express();
const server = app.listen(3000, () =>
  console.log("Server running on http://localhost:3000")
);
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", (ws) => {
  console.log("🔹 New WebSocket connection");

  clients.push(ws);

  ws.on("message", (message) => {
    try {
      // Convert WebSocket messages to JSON and validate them
      const parsedMessage = JSON.parse(message);
      console.log("📩 Received JSON Message from client:", parsedMessage);

      clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          console.log("📤 Forwarding message to peer...");
          client.send(JSON.stringify(parsedMessage));
        }
      });
    } catch (error) {
      console.warn("⚠️ Non-JSON message received, ignoring...");
    }
  });

  ws.on("close", () => {
    console.log("❌ WebSocket client disconnected");
    clients = clients.filter((client) => client !== ws);
  });
});

app.use(express.static("public")); // Serve static files (frontend)
