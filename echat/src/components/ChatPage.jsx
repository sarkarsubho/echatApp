import "./ChatPage.css";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";
import { useEffect, useState, useRef } from "react";
import { socketKeys } from "../constants/socketKeys";

const socket = io("http://localhost:8080", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});

socket.on(socketKeys.CONNECTION_ERROR, (err) => {
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

  const [iamTyping, setIamTyping] = useState(false);
  const typingTimeout = useRef(null);

  useEffect(() => {
    localStorage.setItem("uuid", uuid);
    if (username) {
      socket.emit(socketKeys.USER_JOINED, { uuid, username });
    }

    socket.on(socketKeys.UPDATE_USERS, (users) => {
      delete users[uuid];
      setOnlineUsers(users);
    });

    socket.on(socketKeys.MESSAGE, ({ sender, message }) => {
      setMessages((prev) => [...prev, { sender, message }]);
    });

    socket.on(socketKeys.TYPING, (sender) => {
      setTypingUser(sender);
    });

    socket.on(socketKeys.STOP_TYPING, () => {
      setTypingUser(null);
    });

    return () => {
      socket.off(socketKeys.MESSAGE);
      socket.off(socketKeys.UPDATE_USERS);
      socket.off(socketKeys.TYPING);
      socket.off(socketKeys.STOP_TYPING);
    };
  }, []);

  const handleUsernameSubmit = () => {
    if (username.trim()) {
      localStorage.setItem("uuid", uuid);
      localStorage.setItem("username", username);
      setShowModal(false);
      socket.emit(socketKeys.USER_JOINED, { uuid, username });
    }
  };

  const handleChangeMessage = (value) => {
    setInput(value)
    if (!iamTyping) {
      socket.emit(socketKeys.TYPING, { sender: uuid, receiver })
      setIamTyping(true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit(socketKeys.STOP_TYPING, { sender: uuid, receiver })
      setIamTyping(false);
    }, [2000]);
  };

  const handleSendMessage = () => {
    socket.emit(socketKeys.MESSAGE, { sender: uuid, receiver, message: input });
    setMessages((prev) => [...prev, { sender: uuid, message: input }]);
    setInput("");
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser])

  return (
    <div className="chat-app">
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="text-green">Enter Your Name</h3>
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
          <div key={id} onClick={() => setReceiver(id)} className={`user ${id === receiver && "selectedUser"}`}>
            <strong> {user.name}</strong>
            {user.online ? "🟢" : "🔴"}{" "}
            <strong className="text-green">
              {!receiver && id === typingUser && "Typing..."}
              {receiver && receiver !== typingUser && id === typingUser && "Typing..."}
            </strong>
          </div>
        ))}
      </div>
      {receiver ? <div className="chat-container">
        <div className="chat-header">
          <div className="user-info">
            <div className="profile-icon">
              {onlineUsers[receiver]?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="username">{onlineUsers[receiver]?.name}</div>
              <div className={`status ${onlineUsers[receiver]?.online ? "online" : "offline"}`}>
                {onlineUsers[receiver]?.online ? "Online" : "Offline"}
              </div>
            </div>
          </div>

        </div>
        <div className="messages">
          {receiver && messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.sender === uuid ? "sent" : "received"
                }`}
            >
              <strong>{onlineUsers[msg.sender] ? onlineUsers[msg.sender]?.name : "You"}:</strong>
              <br />
              {msg.message}
            </div>
          ))}
          {receiver && receiver === typingUser && (
            <div className="typing-indicator">{onlineUsers[typingUser]?.name} is typing...</div>
          )}
          <div ref={messagesEndRef}></div>
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => handleChangeMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button
            onClick={handleSendMessage}
            disabled={!receiver}
          >
            Send
          </button>
        </div>
      </div> :
        <div className="chat-container">
          <div className="chat-header"></div>
          <div className="messages notSelectedMsg">
            <h3>Please Select a user to Start chatting.</h3>
          </div>
          <div className="chat-input">
            <input
              type="text"
              disabled={true}
              placeholder="Type a message..."
            />
            <button
              onClick={handleSendMessage}
              disabled={true}
            >
              Send
            </button>
          </div>
        </div>}
    </div>
  );
}
