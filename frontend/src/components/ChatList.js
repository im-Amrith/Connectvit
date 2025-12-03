import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './utils.css';

function ChatList({ onSelectChat, activeChat }) {
  const [chats, setChats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010';

  // Fetch users and chat history from the backend
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch all users
        const usersResponse = await fetch(`${API_URL}/api/users`);
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users');
        }
        const userData = await usersResponse.json();
        
        // Fetch chat history for sorting
        const chatHistoryResponse = await fetch(`${API_URL}/api/chat-history?username=${currentUser.username}`);
        let chatHistory = [];
        
        if (chatHistoryResponse.ok) {
          chatHistory = await chatHistoryResponse.json();
        }
        
        // Process and transform users data
        const usersWithChat = userData
          .filter(user => user.username !== currentUser.username) // Exclude current user
          .map(user => {
            // Find the last message with this user if it exists
            const lastChat = chatHistory.find(chat => 
              chat.type === 'direct' && chat.participants && chat.participants.includes(user.username)
            );
            
            return {
              username: user.username,
              fullName: user.full_name,
              lastMessage: lastChat ? lastChat.lastMessage : 'Click to start chatting',
              timestamp: lastChat ? lastChat.timestamp : null,
              hasHistory: !!lastChat
            };
          });
        
        // Sort users - those with chat history first, then by most recent
        const sortedUsers = usersWithChat.sort((a, b) => {
          // First sort by whether they have chat history
          if (a.hasHistory && !b.hasHistory) return -1;
          if (!a.hasHistory && b.hasHistory) return 1;
          
          // Then sort by timestamp if both have history
          if (a.hasHistory && b.hasHistory) {
            return new Date(b.timestamp) - new Date(a.timestamp);
          }
          
          // Default sort by name
          return a.fullName.localeCompare(b.fullName);
        });
        
        setAllUsers(sortedUsers);
        setChats(sortedUsers.slice(0, 10)); // Only show first 10 by default
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load contacts. Please try again.');
        setAllUsers([]);
        setChats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = allUsers.filter(user => 
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setChats(filtered);
    } else {
      // If search is cleared, show only top 10 again
      setChats(allUsers.slice(0, 10));
    }
  }, [searchTerm, allUsers]);

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h3>Messages</h3>
        <div className="chat-search">
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="chat-list">
        {loading ? (
          <div className="loading-chats">Loading contacts...</div>
        ) : error ? (
          <div className="error-chats">{error}</div>
        ) : chats.length > 0 ? (
          chats.map((chat, index) => (
            <div 
              key={index} 
              className={`chat-item ${activeChat === chat.username ? 'active' : ''} ${chat.hasHistory ? 'has-history' : ''}`}
              onClick={() => onSelectChat(chat.username)}
            >
              <div className="chat-avatar">
                {chat.fullName ? chat.fullName.charAt(0) : '?'}
              </div>
              <div className="chat-info">
                <div className="chat-name">{chat.fullName || chat.username}</div>
                <div className="chat-last-message">{chat.lastMessage}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-chats">No contacts found</div>
        )}
      </div>
    </div>
  );
}

export default ChatList; 