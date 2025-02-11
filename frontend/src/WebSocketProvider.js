import { useEffect, useState } from "react";

const userID = "U123"; 
const receiverID = "R123";

let ws;

const connectWebSocket = (setMessages) => {
  ws = new WebSocket(`ws://localhost:8080/ws?userID=${userID}`);

  ws.onopen = () => {
    console.log("WebSocket connected!");
    keepAlive(); // Keep connection alive
  };

  ws.onmessage = (event) => {
    const newMsg = JSON.parse(event.data);
    setMessages((prev) => [...prev, newMsg]);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = (event) => {
    console.warn(`WebSocket closed: ${event.code} - ${event.reason}`);
    setTimeout(() => connectWebSocket(setMessages), 3000); // Reconnect after 3s
  };
};

const keepAlive = () => {
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 5000);
};

export { connectWebSocket, ws };
