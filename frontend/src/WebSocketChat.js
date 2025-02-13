import { useEffect, useState, useRef } from "react";

const WebSocketChat = () => {
  const [ws, setWs] = useState(null);
  const [userId, setUserId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isInbound, setIsInbound] = useState(false); // New state for inbound flag
  const [connected, setConnected] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const receivedData = JSON.parse(event.data);
        console.log("Received message:", receivedData);

        if (receivedData.type === "message" && receivedData.message) {
          setMessages((prev) => [...prev, receivedData.message]); // Append message object
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setConnected(false);
      };
    }
  }, [ws]);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connectWebSocket = () => {
    if (userId.trim() !== "" && recipientId.trim() !== "") {
      const socket = new WebSocket(`ws://localhost:7000/falkon/notify/api/v1/websocket/connect?userId=${userId}`);
      setWs(socket);

      socket.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
      };
    } else {
      alert("Please enter both User ID and Recipient ID!");
    }
  };

  const sendMessage = () => {
    if (ws && message.trim() !== "" && userId.trim() !== "" && recipientId.trim() !== "") {
      const msgData = {
        type: "message",
        message_body: {
          sender_id: userId,
          participant_id: recipientId,
          recipient_id: recipientId,
          text: message,
          is_inbound: isInbound, // Using the selected value from input
        },
      };
      
      ws.send(JSON.stringify(msgData));
      setMessage("");
    } else {
      alert("Enter a message and ensure you're connected!");
    }
  };

  return (
    <div className="chat-container">
      <h2>Real-Time Chat</h2>

      {!connected ? (
        <div className="login-section">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter Your User ID"
          />
          <input
            type="text"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            placeholder="Enter Recipient ID"
          />
          <button onClick={connectWebSocket}>Connect</button>
        </div>
      ) : (
        <p>Connected as: <strong>{userId}</strong>, chatting with <strong>{recipientId}</strong></p>
      )}

      <div className="chat-box">
        {messages.map((msg, index) => (
          <div 
            key={index}  
            className={`chat-bubble ${msg.senderId === userId ? "sent" : "received"}`}
          >
            <span className="chat-text">{msg.content.value}</span>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </div>

      {connected && (
        <div className="chat-input">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          />

          {/* Dropdown to select inbound status */}
          <select value={isInbound} onChange={(e) => setIsInbound(e.target.value === "true")}>
            <option value="false">Outbound</option>
            <option value="true">Inbound</option>
          </select>

          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
};

export default WebSocketChat;