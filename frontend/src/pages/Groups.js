import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import LeftPanel from '../components/LeftPanel';
import RightPanel from '../components/RightPanel';
import axios from 'axios';
import './Groups.css';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010';

function Groups() {
  const [userGroups, setUserGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeTab, setActiveTab] = useState('myGroups');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [groupMessages, setGroupMessages] = useState([]);
  const [createGroupData, setCreateGroupData] = useState({
    name: '',
    description: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [newMemberUsername, setNewMemberUsername] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadGroups();
    }
  }, [isAuthenticated, navigate]);

  // Check for group ID in URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const groupId = params.get('id');
    
    if (groupId && allGroups.length > 0) {
      const group = allGroups.find(g => g.id === parseInt(groupId) || g.id === groupId);
      if (group) {
        handleSelectGroup(group);
      }
    }
  }, [location.search, allGroups]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  // Load groups from local storage
  const loadGroups = async () => {
    try {
      setLoading(true);
      
      // Fetch user's groups
      const userGroupsResponse = await axios.get(`${API_URL}/api/groups?username=${currentUser.username}`);
      
      // Fetch all groups
      const allGroupsResponse = await axios.get(`${API_URL}/api/all-groups`);
      
      const userGroupsData = userGroupsResponse.data.map(group => ({
        ...group,
        members: group.members || []
      }));
      
      const allGroupsData = allGroupsResponse.data.map(group => ({
        ...group,
        members: group.members || []
      }));

      setAllGroups(allGroupsData);
      setUserGroups(userGroupsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups. Please try again later.');
      setLoading(false);
    }
  };

  // Handle creating a new group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!createGroupData.name.trim()) {
      setError('Group name is required');
      return;
    }
    
    try {
      const response = await axios.post(`${API_URL}/api/groups/create`, {
        name: createGroupData.name.trim(),
        description: createGroupData.description.trim(),
        username: currentUser.username
      });
      
      // The backend returns a minimal response on creation
      // Create a full group object with the data we have
      const newGroup = {
        id: response.data.group_id,
        name: createGroupData.name.trim(),
        description: createGroupData.description.trim(),
        created_by: currentUser.username,
        created_at: new Date().toISOString(),
        members: [currentUser.username],
        is_admin: true
      };
      
      setAllGroups(prevGroups => [...prevGroups, newGroup]);
      setUserGroups(prevGroups => [...prevGroups, newGroup]);
      setCreateGroupData({ name: '', description: '' });
      setShowCreateModal(false);
      setError('');
      
      // Auto select the new group
      handleSelectGroup(newGroup);
      
      // Switch to My Groups tab
      setActiveTab('myGroups');
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group. Try again.');
    }
  };

  // Handle joining a group
  const handleJoinGroup = async (group) => {
    try {
      // Check if already a member
      const members = group.members || [];
      if (members.includes(currentUser.username)) {
        return; // Already a member
      }
      
      const response = await axios.post(`${API_URL}/api/groups/${group.id}/members`, {
        username: currentUser.username,
        added_by: currentUser.username
      });
      
      // Update the group with the current user as a member
      const updatedGroup = { 
        ...group, 
        members: [...(group.members || []), currentUser.username] 
      };
      
      // Update the lists
      setAllGroups(prevGroups => prevGroups.map(g => 
        g.id === group.id ? updatedGroup : g
      ));
      setUserGroups(prevGroups => [...prevGroups, updatedGroup]);
      
      // Select the joined group to fetch full details
      handleSelectGroup(updatedGroup);
      
      // Switch to My Groups tab
      setActiveTab('myGroups');
    } catch (err) {
      console.error('Error joining group:', err);
      setError('Failed to join group. Try again.');
    }
  };

  // Handle leaving a group
  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        await axios.post(`${API_URL}/api/groups/${selectedGroup.id}/leave`, {
          username: currentUser.username
        });
        
        setAllGroups(prevGroups => prevGroups.filter(g => g.id !== selectedGroup.id));
        setUserGroups(prevGroups => prevGroups.filter(g => g.id !== selectedGroup.id));
        setSelectedGroup(null);
        setGroupMessages([]);
      } catch (err) {
        console.error('Error leaving group:', err);
        setError('Failed to leave group. Try again.');
      }
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim() || !selectedGroup) return;
    
    try {
      const response = await axios.post(`${API_URL}/api/groups/${selectedGroup.id}/messages`, {
        sender: currentUser.username,
        message: message.trim(),
        timestamp: new Date().toISOString()
      });
      
      setAllGroups(prevGroups => prevGroups.map(g => 
        g.id === selectedGroup.id ? { ...g, messages: [...(g.messages || []), response.data] } : g
      ));
      setUserGroups(prevGroups => prevGroups.map(g => 
        g.id === selectedGroup.id ? { ...g, messages: [...(g.messages || []), response.data] } : g
      ));
      setSelectedGroup({ ...selectedGroup, messages: [...(selectedGroup.messages || []), response.data] });
      setGroupMessages(prevMessages => [...prevMessages, response.data]);
      setMessage('');
      
      // Process notifications for mentions
      processMentionNotifications(response.data, selectedGroup);
      
      // Focus input field again
      messageInputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Extract mentions from message
  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]); // Push the username without the @ symbol
    }
    
    return mentions;
  };

  // Process notifications for mentioned users
  const processMentionNotifications = (message, group) => {
    if (!message.mentions || message.mentions.length === 0) return;
    
    try {
      // Get existing notifications
      const savedNotifications = localStorage.getItem('notifications');
      const notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
      
      // Create new notifications for each mentioned user
      const newNotifications = message.mentions.map(username => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        type: 'mention',
        sender: currentUser.username,
        senderName: currentUser.full_name,
        recipient: username,
        groupId: group.id,
        groupName: group.name,
        message: message.content,
        timestamp: message.timestamp,
        read: false
      }));
      
      // Save notifications
      localStorage.setItem('notifications', JSON.stringify([...notifications, ...newNotifications]));
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'some time ago';
    }
  };

  // Check if user is member of group
  const isGroupMember = (group) => {
    if (!group) return false;
    return userGroups.some(ug => ug.id === group.id);
  };

  // Handle key press in message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Fetch group details
  const fetchGroupDetails = async (groupId) => {
    try {
      const response = await axios.get(`${API_URL}/api/groups/${groupId}`);
      // ... existing code ...
      setGroupMembers(response.data.members);
    } catch (err) {
      console.error('Error fetching group details:', err);
    }
  };

  // Fetch group messages
  const fetchGroupMessages = async (groupId) => {
    try {
      const response = await axios.get(`http://localhost:5010/api/groups/${groupId}/messages`);
      setGroupMessages(response.data);
    } catch (err) {
      console.error('Error fetching group messages:', err);
    }
  };

  // Handle adding a new member to the group
  const handleAddMember = async (e) => {
    e.preventDefault();
    
    if (!newMemberUsername.trim() || !selectedGroup) return;
    
    try {
      await axios.post(`http://localhost:5010/api/groups/${selectedGroup.id}/members`, {
        username: newMemberUsername,
        added_by: currentUser.username
      });
      
      setNewMemberUsername('');
      
      // Refresh group details
      fetchGroupDetails(selectedGroup.id);
    } catch (err) {
      console.error('Error adding member:', err);
      alert(err.response?.data?.error || 'Failed to add member');
    }
  };

  // Handle selecting a group
  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    setGroupMessages([]);
    
    try {
      // Fetch group details to get members
      const detailsResponse = await axios.get(`http://localhost:5010/api/groups/${group.id}`);
      // Update the selected group with members from the response
      setSelectedGroup(prev => ({
        ...prev,
        members: detailsResponse.data.members || []
      }));
      setGroupMembers(detailsResponse.data.members || []);
      
      // Fetch group messages
      const messagesResponse = await axios.get(`http://localhost:5010/api/groups/${group.id}/messages`);
      setGroupMessages(messagesResponse.data || []);
    } catch (err) {
      console.error('Error fetching group data:', err);
      setError('Failed to load group details.');
    }
  };

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  return (
    <div className="groups-container">
      <LeftPanel />
      
      <div className="groups-main-content">
        {/* Groups Sidebar */}
        <div className="groups-sidebar">
          <div className="groups-header">
            <h2 className="groups-title">Study Groups</h2>
            <button className="create-group-btn" onClick={() => setShowCreateModal(true)}>
              Create
            </button>
          </div>
          
          <div className="groups-tabs">
            <div 
              className={`groups-tab ${activeTab === 'myGroups' ? 'active' : ''}`}
              onClick={() => setActiveTab('myGroups')}
            >
              My Groups
            </div>
            <div 
              className={`groups-tab ${activeTab === 'discover' ? 'active' : ''}`}
              onClick={() => setActiveTab('discover')}
            >
              Discover
            </div>
          </div>
          
          {activeTab === 'myGroups' ? (
            <div className="groups-list">
              {userGroups.length === 0 ? (
                <div style={{ padding: '15px', color: '#999', textAlign: 'center' }}>
                  You haven't joined any groups yet.
                </div>
              ) : (
                userGroups.map(group => (
                  <div 
                    key={group.id}
                    className={`group-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
                    onClick={() => handleSelectGroup(group)}
                  >
                    <div className="group-item-name">{group.name}</div>
                    <div className="group-item-info">
                      <span>{(group.members || []).length} members</span>
                      <span>{formatDate(group.created_at || group.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="discover-groups-container">
              {allGroups.filter(group => group && !isGroupMember(group)).length === 0 ? (
                <div style={{ padding: '15px', color: '#999', textAlign: 'center', gridColumn: '1 / -1' }}>
                  No other groups to discover.
                </div>
              ) : (
                allGroups.filter(group => group && !isGroupMember(group)).map(group => (
                  <div key={group.id} className="discover-group-card">
                    <div className="discover-group-name">{group.name}</div>
                    <div className="discover-group-description">
                      {group.description || 'No description available.'}
                    </div>
                    <div className="discover-group-meta">
                      <span>{(group.members || []).length} members</span>
                      <span>Created {formatDate(group.created_at || group.createdAt)}</span>
                    </div>
                    <button 
                      className="join-group-btn"
                      onClick={() => handleJoinGroup(group)}
                    >
                      Join Group
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Chat Area */}
        {selectedGroup ? (
          <div className="group-chat-area">
            <div className="group-chat-header">
              <div className="group-chat-info">
                <h2 className="group-chat-name">{selectedGroup.name}</h2>
                <div className="group-chat-details">
                  <span>{(selectedGroup.members || []).length} members</span>
                  <span>Created by @{selectedGroup.created_by || selectedGroup.creator}</span>
                </div>
              </div>
              <div className="group-header-actions">
                <button 
                  className="group-header-btn"
                  onClick={() => setShowMembersModal(true)}
                >
                  View Members
                </button>
                {currentUser.username !== (selectedGroup.created_by || selectedGroup.creator) && (
                  <button 
                    className="group-header-btn leave"
                    onClick={handleLeaveGroup}
                  >
                    Leave Group
                  </button>
                )}
              </div>
            </div>
            
            <div className="group-messages-container">
              {groupMessages.length === 0 ? (
                <div className="empty-chat">
                  <div className="empty-chat-icon">💬</div>
                  <h3 className="empty-chat-title">No messages yet</h3>
                  <p className="empty-chat-subtitle">
                    Be the first to start a conversation in this group.
                  </p>
                </div>
              ) : (
                groupMessages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`message-item ${msg.sender === currentUser.username ? 'own-message' : ''}`}
                  >
                    <div className="message-bubble">
                      {msg.sender !== currentUser.username && (
                        <div className="message-sender">@{msg.sender}</div>
                      )}
                      <div className="message-text">{msg.content}</div>
                    </div>
                    <div className="message-time">
                      {formatDate(msg.timestamp)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="message-input-container">
              <div className="message-form">
                <textarea
                  ref={messageInputRef}
                  className="message-textarea"
                  placeholder="Type a message... Use @username to mention"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={1}
                />
                <button 
                  className="send-message-btn"
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="group-chat-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-chat" style={{ maxWidth: '400px' }}>
              <div className="empty-chat-icon">👥</div>
              <h3 className="empty-chat-title">Select a group to chat</h3>
              <p className="empty-chat-subtitle">
                Choose a group from the sidebar or discover new groups to join.
              </p>
              <button 
                className="create-group-btn" 
                style={{ marginTop: '20px' }}
                onClick={() => setShowCreateModal(true)}
              >
                Create New Group
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="group-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="group-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-header">
              <h3 className="group-modal-title">Create Study Group</h3>
              <button 
                className="group-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="group-modal-body">
              {error && <div className="group-error">{error}</div>}
              
              <div className="group-form-group">
                <label className="group-form-label">Group Name</label>
                <input
                  type="text"
                  className="group-form-input"
                  placeholder="Enter group name"
                  value={createGroupData.name}
                  onChange={(e) => setCreateGroupData({...createGroupData, name: e.target.value})}
                />
              </div>
              
              <div className="group-form-group">
                <label className="group-form-label">Description</label>
                <textarea
                  className="group-form-textarea"
                  placeholder="What is this group about?"
                  value={createGroupData.description}
                  onChange={(e) => setCreateGroupData({...createGroupData, description: e.target.value})}
                />
              </div>
            </div>
            
            <div className="group-modal-footer">
              <button 
                className="group-modal-btn group-modal-cancel"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="group-modal-btn group-modal-submit"
                onClick={handleCreateGroup}
                disabled={!createGroupData.name.trim()}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="group-modal-backdrop" onClick={() => setShowMembersModal(false)}>
          <div className="group-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-header">
              <h3 className="group-modal-title">Group Members</h3>
              <button 
                className="group-modal-close"
                onClick={() => setShowMembersModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="group-modal-body">
              <div className="members-list">
                {groupMembers.map(member => (
                  <div key={member.username} className="member-item">
                    <div className="member-avatar">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-info">
                      <div className="member-name">@{member.username}</div>
                    </div>
                    {member.is_admin && (
                      <div className="member-role">
                        Admin
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="group-modal-footer">
              <button 
                className="group-modal-btn group-modal-cancel"
                onClick={() => setShowMembersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Groups;