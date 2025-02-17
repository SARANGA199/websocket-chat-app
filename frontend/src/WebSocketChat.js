import { useEffect, useState, useRef } from "react";

const WebSocketChat = () => {
  const [ws, setWs] = useState(null);
  const [userId, setUserId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isInbound, setIsInbound] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
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
          is_inbound: isInbound,
        },
      };

      ws.send(JSON.stringify(msgData));
      setMessage("");
    } else {
      alert("Enter a message and ensure you're connected!");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1];
        setSelectedFile({ data: base64Data, type: file.type });
      };
    }
  };

  const mimeToExtension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  };
  
  const sendMMSMessage = () => {
    if (ws && userId.trim() !== "" && recipientId.trim() !== "" && selectedFile) {
      const mimeType = selectedFile.type;
      const fileExtension = mimeToExtension[mimeType] || "unknown"; // Get extension or default to "unknown"
  
      console.log("File MIME type:", mimeType);
      console.log("File extension:", fileExtension); 
  
      const msgData = {
        type: "mms_message",
        mms_message: {
          sender_id: userId,
          recipient_id: recipientId,
          participant_id: recipientId,
          media_payload: {
            value: selectedFile.data,
            file_name: `uploaded_file.${fileExtension}`,
            file_type: fileExtension,
          },
          is_inbound: isInbound,
        },
      };
  
      ws.send(JSON.stringify(msgData));
      setSelectedFile(null);
    } else {
      alert("Select a file and ensure you're connected!");
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
        <p>
          Connected as: <strong>{userId}</strong>, chatting with <strong>{recipientId}</strong>
        </p>
      )}

      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.senderId === userId ? "sent" : "received"}`}>
            {msg.content.type === "text" ? (
                <span className="chat-text">{msg.content.value}</span>
              ) : msg.content && msg.content.type ? (
                ["jpg", "jpeg", "png", "gif"].includes(msg.content.type) ? (
                  // Display images
                  <img
                    src={msg.content.value}
                    alt="Media"
                    className="chat-media"
                  />
                ) : (
                  // Provide a download link for documents
                  <a
                    href={msg.content.value}
                    download={msg.content.value}
                    className="chat-file-link"
                  >
                    📄 Download {msg.content.type.toUpperCase()} File
                  </a>
                )
              ) : null}
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

    <select value={isInbound} onChange={(e) => setIsInbound(e.target.value === "true")}>
      <option value="false">Outbound</option>
      <option value="true">Inbound</option>
    </select>

    <button onClick={sendMessage}>Send</button>

    <div className="file-upload">
      <input type="file" id="fileInput" onChange={handleFileUpload} />
      <label htmlFor="fileInput">Choose File</label>
      <button onClick={sendMMSMessage} disabled={!selectedFile}>Send Media</button>
    </div>
  </div>
)}
    </div>
  );
};

export default WebSocketChat;
