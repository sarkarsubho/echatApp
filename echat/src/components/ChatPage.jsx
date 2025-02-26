import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./ChatPage.css";
import { v4 as uuidv4 } from "uuid";

const socket = io("http://localhost:8080", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState({});
  const [receiver, setReceiver] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [uuid, setUuid] = useState(localStorage.getItem("uuid") || uuidv4());
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [showModal, setShowModal] = useState(!localStorage.getItem("username"));
  const messagesEndRef = useRef(null);

  useEffect(() => {
    //   localStorage.setItem("uuid", uuid);
    //   if (username) {
    //     socket.emit("user-joined", { uuid, username });
    //   }

    socket.on("update-users", (users) => {
      users = users.filter;
      setOnlineUsers(users);
    });

    socket.on("message", ({ sender, message }) => {
      setMessages((prev) => [...prev, { sender, message }]);
    });

    socket.on("typing", (sender) => {
      setTypingUser(sender);
    });

    socket.on("stop-typing", () => {
      setTypingUser(null);
    });

    return () => {
      socket.off("message");
      socket.off("update-users");
      socket.off("typing");
      socket.off("stop-typing");
    };
  }, []);

  const handleUsernameSubmit = () => {
    if (username.trim()) {
      localStorage.setItem("uuid", uuid);
      localStorage.setItem("username", username);
      setShowModal(false);
      socket.emit("user-joined", { uuid, username });
    }
  };

  return (
    <div className="chat-app">
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Enter Your Name</h3>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
            />
            <button onClick={handleUsernameSubmit}>Join</button>
          </div>
        </div>
      )}
      <div className="sidebar">
        <h3>Online Users</h3>
        {Object.entries(onlineUsers).map(([id, user]) => (
          <div key={id} onClick={() => setReceiver(id)} className="user">
            {user.name} {user.online ? "🟢" : "🔴"}{" "}
            {id === receiver && "(Chatting)"}
          </div>
        ))}
      </div>
      <div className="chat-container">
        <div className="chat-header">
          {receiver ? onlineUsers[receiver]?.name : "Select a user"}
        </div>
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.sender === username ? "sent" : "received"
              }`}
            >
              <strong>{msg.sender}:</strong> {msg.message}
            </div>
          ))}
          {typingUser && (
            <div className="typing-indicator">{typingUser} is typing...</div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button
            onClick={() =>
              socket.emit("message", { sender: uuid, receiver, message: input })
            }
            disabled={!receiver}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
