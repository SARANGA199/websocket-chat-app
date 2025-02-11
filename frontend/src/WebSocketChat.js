import { useEffect, useState, useRef } from "react";

const WebSocketChat = () => {
  const [ws, setWs] = useState(null);
  const [userId, setUserId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const chatEndRef = useRef(null);

  // useEffect(() => {
  //   if (ws) {
  //     ws.onmessage = (event) => {
  //       const receivedMessage = JSON.parse(event.data);
  //       console.log("Received message:", receivedMessage);

  //       setMessages((prev) => {
  //         if (!prev.some((msg) => msg.id === receivedMessage.id)) {
  //           return [...prev, receivedMessage];
  //         }
  //         return prev;
  //       });
  //     };

  //     ws.onclose = () => {
  //       console.log("WebSocket disconnected");
  //       setConnected(false);
  //     };
  //   }
  // }, [ws]);
  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const receivedMessage = JSON.parse(event.data);
        console.log("Received message:", receivedMessage);
  
        setMessages((prev) => [...prev, receivedMessage]); // Directly add the new message
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
      const socket = new WebSocket(`ws://localhost:8080/ws?userId=${userId}`);
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
        senderId: userId,
        receiverId: recipientId,
        content: message,
        type: "message",
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
            <span className="chat-text">{msg.content}</span>
            <span className="chat-time">{msg.timestamp}</span>
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
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
};

export default WebSocketChat;
