import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import LeftPanel from '../components/LeftPanel';
import './UserProfile.css';

function UserProfile() {
  const { username } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // Fetch user profile from API
        const response = await fetch(`http://localhost:5010/api/user-profile?username=${username}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to fetch user profile');
        }
        
        const data = await response.json();
        setUserProfile(data);
        
        // Check if current user is following this user
        checkFollowingStatus();
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (username && isAuthenticated) {
      fetchUserProfile();
    }
  }, [username, isAuthenticated]);

  // Check if current user is following this user
  const checkFollowingStatus = () => {
    if (currentUser) {
      try {
        // Get following list from localStorage
        const followingList = localStorage.getItem(`following_${currentUser.username}`);
        if (followingList) {
          const following = JSON.parse(followingList);
          setIsFollowing(following.includes(username));
        }
      } catch (error) {
        console.error('Error checking following status:', error);
      }
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = () => {
    if (!currentUser) return;
    
    try {
      // Get current following list
      let followingList = [];
      const saved = localStorage.getItem(`following_${currentUser.username}`);
      
      if (saved) {
        followingList = JSON.parse(saved);
      }
      
      if (isFollowing) {
        // Unfollow: remove from list
        followingList = followingList.filter(user => user !== username);
      } else {
        // Follow: add to list
        followingList.push(username);
        
        // Create notification for followed user
        createFollowNotification();
      }
      
      // Save updated list
      localStorage.setItem(`following_${currentUser.username}`, JSON.stringify(followingList));
      
      // Update followers list for target user
      updateFollowers(!isFollowing);
      
      // Update state
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  // Create follow notification
  const createFollowNotification = () => {
    try {
      // Get existing notifications
      const savedNotifications = localStorage.getItem('notifications');
      const notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
      
      // Create new notification
      const newNotification = {
        id: Date.now().toString(),
        type: 'follow',
        sender: currentUser.username,
        senderName: currentUser.full_name,
        recipient: username,
        message: `${currentUser.full_name} started following you`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      // Save notification
      localStorage.setItem('notifications', JSON.stringify([...notifications, newNotification]));
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Update followers list for target user
  const updateFollowers = (isAdding) => {
    try {
      if (!currentUser || !username) return;
      
      let followersList = [];
      const saved = localStorage.getItem(`followers_${username}`);
      
      if (saved) {
        followersList = JSON.parse(saved);
      }
      
      if (isAdding) {
        // Add current user to followers
        if (!followersList.includes(currentUser.username)) {
          followersList.push(currentUser.username);
        }
      } else {
        // Remove current user from followers
        followersList = followersList.filter(user => user !== currentUser.username);
      }
      
      // Save updated list
      localStorage.setItem(`followers_${username}`, JSON.stringify(followersList));
    } catch (error) {
      console.error('Error updating followers:', error);
    }
  };

  // Get follower and following counts
  const getFollowerCount = () => {
    try {
      const saved = localStorage.getItem(`followers_${username}`);
      return saved ? JSON.parse(saved).length : 0;
    } catch (error) {
      return 0;
    }
  };

  const getFollowingCount = () => {
    try {
      const saved = localStorage.getItem(`following_${username}`);
      return saved ? JSON.parse(saved).length : 0;
    } catch (error) {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <LeftPanel />
        <div className="user-profile-container">
          <div className="loading-profile">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="page-container">
        <LeftPanel />
        <div className="user-profile-container">
          <div className="profile-error">
            <h2>{error || 'User not found'}</h2>
            <button onClick={() => navigate('/search')} className="back-button">
              Back to Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't show follow button for own profile
  const isOwnProfile = currentUser && currentUser.username === username;

  return (
    <div className="page-container">
      <LeftPanel />
      
      <div className="user-profile-container">
        <div className="user-profile-header">
          <div className="profile-avatar-large">
            {userProfile.full_name ? userProfile.full_name.charAt(0).toUpperCase() : '?'}
          </div>
          
          <div className="profile-info">
            <div className="profile-title-row">
              <h1 className="profile-name">{userProfile.full_name}</h1>
              
              {!isOwnProfile && (
                <button 
                  className={`follow-button ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
              
              {isOwnProfile && (
                <button 
                  className="edit-profile-button"
                  onClick={() => navigate('/profile')}
                >
                  Edit Profile
                </button>
              )}
            </div>
            
            <div className="profile-username">@{userProfile.username}</div>
            
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{getFollowerCount()}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{getFollowingCount()}</span>
                <span className="stat-label">Following</span>
              </div>
            </div>
            
            <div className="profile-bio">
              {userProfile.bio || 'No bio available'}
            </div>
          </div>
        </div>
        
        <div className="profile-content">
          <div className="content-header">
            <h2>Activity</h2>
          </div>
          
          <div className="no-activity">
            <p>No activity to show yet.</p>
          </div>
          
          {!isOwnProfile && (
            <div className="profile-actions">
              <button className="message-button" onClick={() => navigate(`/chats?user=${username}`)}>
                Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile; 