import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import LeftPanel from '../components/LeftPanel';
import './Notifications.css';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadNotifications();
    }
  }, [isAuthenticated, navigate]);

  // Load notifications from local storage
  const loadNotifications = () => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      let notifs = savedNotifications ? JSON.parse(savedNotifications) : [];
      
      // Filter notifications for current user
      if (currentUser) {
        notifs = notifs.filter(notif => notif.recipient === currentUser.username);
        
        // Sort by timestamp (newest first)
        notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      
      setNotifications(notifs);
      setLoading(false);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setLoading(false);
    }
  };

  // Filter notifications based on type
  const getFilteredNotifications = () => {
    if (activeFilter === 'all') {
      return notifications;
    }
    return notifications.filter(notif => notif.type === activeFilter);
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    try {
      const updatedNotifs = notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      
      localStorage.setItem('notifications', JSON.stringify(updatedNotifs));
      setNotifications(updatedNotifs);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    try {
      const updatedNotifs = notifications.map(notif => ({ ...notif, read: true }));
      
      localStorage.setItem('notifications', JSON.stringify(updatedNotifs));
      setNotifications(updatedNotifs);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = (notificationId) => {
    try {
      const updatedNotifs = notifications.filter(notif => notif.id !== notificationId);
      
      // Update localStorage with all notifications (not just current user's)
      const savedNotifications = localStorage.getItem('notifications');
      let allNotifs = savedNotifications ? JSON.parse(savedNotifications) : [];
      allNotifs = allNotifs.filter(notif => notif.id !== notificationId);
      
      localStorage.setItem('notifications', JSON.stringify(allNotifs));
      setNotifications(updatedNotifs);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    try {
      // Remove only current user's notifications
      const savedNotifications = localStorage.getItem('notifications');
      let allNotifs = savedNotifications ? JSON.parse(savedNotifications) : [];
      allNotifs = allNotifs.filter(notif => notif.recipient !== currentUser.username);
      
      localStorage.setItem('notifications', JSON.stringify(allNotifs));
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Navigate to group based on notification
  const navigateToGroup = (groupId) => {
    navigate(`/groups?id=${groupId}`);
  };

  // Count unread notifications
  const countUnread = (type = null) => {
    if (type === null) {
      return notifications.filter(notif => !notif.read).length;
    }
    return notifications.filter(notif => !notif.read && notif.type === type).length;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'sometime ago';
    }
  };

  // Get avatar letter
  const getAvatarLetter = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="page-container">
      <LeftPanel />
      
      <div className="notifications-container">
        <div className="notifications-header">
          <h1 className="notifications-title">Notifications</h1>
          
          {notifications.length > 0 && (
            <div className="notifications-actions">
              <button className="mark-all-read" onClick={markAllAsRead}>
                Mark all as read
              </button>
              <button className="clear-all" onClick={clearAllNotifications}>
                Clear all
              </button>
            </div>
          )}
        </div>
        
        {/* Filter tabs */}
        <div className="notification-filters">
          <div 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
            {countUnread() > 0 && <span className="counter">{countUnread()}</span>}
          </div>
          <div 
            className={`filter-tab ${activeFilter === 'mention' ? 'active' : ''}`}
            onClick={() => setActiveFilter('mention')}
          >
            Mentions
            {countUnread('mention') > 0 && <span className="counter">{countUnread('mention')}</span>}
          </div>
          <div 
            className={`filter-tab ${activeFilter === 'post' ? 'active' : ''}`}
            onClick={() => setActiveFilter('post')}
          >
            Posts
            {countUnread('post') > 0 && <span className="counter">{countUnread('post')}</span>}
          </div>
          <div 
            className={`filter-tab ${activeFilter === 'follow' ? 'active' : ''}`}
            onClick={() => setActiveFilter('follow')}
          >
            Follows
            {countUnread('follow') > 0 && <span className="counter">{countUnread('follow')}</span>}
          </div>
          <div 
            className={`filter-tab ${activeFilter === 'like' ? 'active' : ''}`}
            onClick={() => setActiveFilter('like')}
          >
            Likes
            {countUnread('like') > 0 && <span className="counter">{countUnread('like')}</span>}
          </div>
        </div>
        
        {filteredNotifications.length > 0 ? (
          <div className="notifications-list">
            {filteredNotifications.map(notification => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="notification-avatar">
                  {getAvatarLetter(notification.senderName)}
                </div>
                
                <div className="notification-content">
                  <div className="notification-header">
                    <p className="notification-message">
                      <span className="highlight">@{notification.sender}</span> {' '}
                      {notification.type === 'mention' && 'mentioned you in a group'}
                      {notification.type === 'post' && 'shared a new post'}
                      {notification.type === 'follow' && 'started following you'}
                      {notification.type === 'like' && 'liked your post'}
                      {notification.type === 'comment' && 'commented on your post'}
                    </p>
                  </div>
                  
                  <div className="notification-info">
                    <span className="notification-time">
                      {formatTime(notification.timestamp)}
                    </span>
                    <span className={`notification-type ${notification.type}`}>
                      {notification.type}
                    </span>
                  </div>
                  
                  {/* Group information for mention notifications */}
                  {notification.type === 'mention' && notification.groupId && (
                    <div className="notification-group">
                      <div className="notification-group-name">
                        {notification.groupName}
                      </div>
                      <div className="notification-group-info">
                        {notification.message}
                      </div>
                      <button 
                        className="notification-group-action"
                        onClick={() => navigateToGroup(notification.groupId)}
                      >
                        Go to Group
                      </button>
                    </div>
                  )}

                  {/* Post information for post notifications */}
                  {notification.type === 'post' && notification.postId && (
                    <div className="notification-group">
                      <div className="notification-group-name">
                        New Post
                      </div>
                      <div className="notification-group-info">
                        {notification.message}
                      </div>
                      <button 
                        className="notification-group-action"
                        onClick={() => navigate('/home')}
                      >
                        View Post
                      </button>
                    </div>
                  )}

                  {/* Like notification details */}
                  {notification.type === 'like' && notification.postId && (
                    <div className="notification-group">
                      <div className="notification-group-name">
                        Post Like
                      </div>
                      <div className="notification-group-info">
                        Someone liked your post
                      </div>
                      <button 
                        className="notification-group-action"
                        onClick={() => navigate('/home')}
                      >
                        View Post
                      </button>
                    </div>
                  )}

                  {/* Comment notification details */}
                  {notification.type === 'comment' && notification.postId && (
                    <div className="notification-group">
                      <div className="notification-group-name">
                        Post Comment
                      </div>
                      <div className="notification-group-info">
                        {notification.message}
                      </div>
                      <button 
                        className="notification-group-action"
                        onClick={() => navigate('/home')}
                      >
                        View Comment
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="notification-actions">
                  {!notification.read && (
                    <button 
                      className="notification-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button 
                    className="notification-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-notifications">
            <div className="empty-notifications-icon">🔔</div>
            <h3 className="empty-notifications-title">No notifications yet</h3>
            <p className="empty-notifications-text">
              When you receive notifications, they will appear here.
              Interact with other users and groups to start receiving notifications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;