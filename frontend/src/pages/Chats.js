import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import LeftPanel from '../components/LeftPanel';
import ChatList from '../components/ChatList';
import ChatInterface from '../components/ChatInterface';
import '../components/utils.css';

function Chats() {
  const [activeChat, setActiveChat] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSelectChat = (username) => {
    setActiveChat(username);
  };

  // Show loading or redirect if not authenticated
  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="page-container">
      <LeftPanel />
      
      <div className="chat-container chats-page">
        <ChatList onSelectChat={handleSelectChat} activeChat={activeChat} />
        <ChatInterface activeChat={activeChat} />
      </div>
    </div>
  );
}

export default Chats;