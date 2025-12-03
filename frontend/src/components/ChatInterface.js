import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import './utils.css';

function ChatInterface({ activeChat }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { currentUser } = useAuth();
  
  // Get username from auth context
  const getCurrentUsername = () => {
    if (currentUser && currentUser.username) {
      return currentUser.username;
    }
    return null;
  };

  const currentUsername = getCurrentUsername();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010';

  // Connect to socket when component mounts
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [API_URL]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (socket && activeChat && currentUsername) {
      // Join the room for this chat
      socket.emit('join', { sender: currentUsername, receiver: activeChat });
      
      // Fetch messages from backend
      const fetchMessages = async () => {
        try {
          setLoading(true);
          const response = await fetch(`${API_URL}/api/messages?sender=${currentUsername}&receiver=${activeChat}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch messages');
          }
          
          const data = await response.json();
          setMessages(data);
          setError(null);
        } catch (err) {
          console.error('Error fetching messages:', err);
          setError('Failed to load messages. Please try again.');
          setMessages([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchMessages();
    }
  }, [socket, activeChat, currentUsername]);

  // Listen for incoming messages
  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message) => {
        setMessages(prevMessages => [...prevMessages, message]);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('receive_message');
      }
    };
  }, [socket]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket && activeChat && currentUsername) {
      const timestamp = new Date().toISOString();
      const messageData = {
        sender: currentUsername,
        receiver: activeChat,
        message: newMessage.trim(),
        timestamp: timestamp
      };
      
      // Send to server
      socket.emit('send_message', messageData);
      setNewMessage('');
    }
  };

  if (!currentUsername) {
    return (
      <div className="chat-interface-container empty-chat">
        <div className="not-logged-in">
          <p>Please log in to access chat</p>
        </div>
      </div>
    );
  }

  if (!activeChat) {
    return (
      <div className="chat-interface-container empty-chat">
        <div className="no-chat-selected">
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface-container">
      <div className="chat-header">
        <h3>{activeChat}</h3>
      </div>
      
      <div className="messages-container">
        {loading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : error ? (
          <div className="error-messages">{error}</div>
        ) : messages.length > 0 ? (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.sender === currentUsername ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                {msg.message}
              </div>
              <div className="message-timestamp">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          ))
        ) : (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-input-container" onSubmit={handleSendMessage}>
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" disabled={!newMessage.trim()}>Send</button>
      </form>
    </div>
  );
}

export default ChatInterface; 