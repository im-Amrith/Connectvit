import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import LeftPanel from '../components/LeftPanel';
import '../components/utils.css';
import './Profile.css';

function Profile() {
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [error, setError] = useState('');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const navigate = useNavigate();
  const { currentUser, logout, isAuthenticated, loading } = useAuth();

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;
      
      try {
        // Try to fetch bio from backend
        const response = await fetch(`http://localhost:5010/api/user-profile?username=${currentUser.username}`);
        if (response.ok) {
          const data = await response.json();
          setBio(data.bio || '');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        // If we can't fetch, use whatever might be stored locally
        setBio(currentUser.bio || '');
      }
    };
    
    fetchUserProfile();
  }, [currentUser]);

  // Fetch followers and following lists
  useEffect(() => {
    if (!currentUser) return;

    try {
      // Get followers list
      const followersData = localStorage.getItem(`followers_${currentUser.username}`);
      if (followersData) {
        setFollowers(JSON.parse(followersData));
      } else {
        setFollowers([]);
      }

      // Get following list
      const followingData = localStorage.getItem(`following_${currentUser.username}`);
      if (followingData) {
        setFollowing(JSON.parse(followingData));
      } else {
        setFollowing([]);
      }
    } catch (err) {
      console.error('Error loading followers/following:', err);
    }
  }, [currentUser]);

  // Fetch user profiles for followers and following
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (!currentUser) return;
      
      try {
        const response = await fetch('http://localhost:5010/api/users');
        if (response.ok) {
          const users = await response.json();
          
          // Create a map of username to profile data
          const profileMap = {};
          users.forEach(user => {
            profileMap[user.username] = user;
          });
          
          setUserProfiles(profileMap);
        }
      } catch (err) {
        console.error('Error fetching user profiles:', err);
      }
    };
    
    if (followers.length > 0 || following.length > 0) {
      fetchUserProfiles();
    }
  }, [followers, following, currentUser]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveBio = async () => {
    try {
      setSavingBio(true);
      setError('');
      
      const response = await fetch('http://localhost:5010/api/update-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: currentUser.username,
          bio: bio 
        }),
      });
      
      if (response.ok) {
        setEditingBio(false);
        // Update local user data
        const updatedUser = { ...currentUser, bio };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        const data = await response.json();
        setError(data.error || 'Could not update bio');
      }
    } catch (err) {
      console.error('Error updating bio:', err);
      setError('Server error. Try again later.');
    } finally {
      setSavingBio(false);
    }
  };

  const handleNavigateToUser = (username) => {
    navigate(`/profile/${username}`);
  };

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="page-container">
      <LeftPanel />
      
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="profile-name-container">
              <h2 className="profile-name">{currentUser.full_name}</h2>
              <p className="profile-username">@{currentUser.username}</p>
            </div>
          </div>
          
          <div className="profile-section">
            <h3 className="section-title">Bio</h3>
            {editingBio ? (
              <div className="bio-edit-container">
                <textarea 
                  className="bio-textarea"
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  placeholder="Write something about yourself..."
                  maxLength={200}
                />
                <div className="bio-actions">
                  <button 
                    className="bio-save-btn" 
                    onClick={handleSaveBio}
                    disabled={savingBio}
                  >
                    {savingBio ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    className="bio-cancel-btn" 
                    onClick={() => setEditingBio(false)}
                    disabled={savingBio}
                  >
                    Cancel
                  </button>
                </div>
                {error && <div className="bio-error">{error}</div>}
              </div>
            ) : (
              <div className="bio-display">
                <p className="bio-text">{bio || 'No bio added yet.'}</p>
                <button 
                  className="bio-edit-btn" 
                  onClick={() => setEditingBio(true)}
                >
                  Edit Bio
                </button>
              </div>
            )}
          </div>
          
          <div className="profile-section">
            <h3 className="section-title">Account</h3>
            <div className="account-details">
              <div className="account-item">
                <span className="account-label">Email:</span>
                <span className="account-value">{currentUser.email}</span>
              </div>
              <div className="account-item">
                <span className="account-label">Member since:</span>
                <span className="account-value">
                  {currentUser.date_of_joining || 'Not available'}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-section connections-section">
            <div className="connections-header">
              <div 
                className={`connection-tab ${showFollowers ? 'active' : ''}`}
                onClick={() => { setShowFollowers(true); setShowFollowing(false); }}
              >
                <span className="connection-count">{followers.length}</span>
                <span className="connection-label">Followers</span>
              </div>
              <div 
                className={`connection-tab ${showFollowing ? 'active' : ''}`}
                onClick={() => { setShowFollowers(false); setShowFollowing(true); }}
              >
                <span className="connection-count">{following.length}</span>
                <span className="connection-label">Following</span>
              </div>
            </div>
            
            <div className="connections-content">
              {showFollowers && (
                <div className="connection-list">
                  <h4 className="connection-title">People following you</h4>
                  
                  {followers.length === 0 ? (
                    <p className="no-connections">You don't have any followers yet.</p>
                  ) : (
                    <div className="users-grid">
                      {followers.map(username => {
                        const profile = userProfiles[username];
                        return (
                          <div 
                            key={username} 
                            className="user-item"
                            onClick={() => handleNavigateToUser(username)}
                          >
                            <div className="user-avatar-small">
                              {profile ? profile.full_name.charAt(0).toUpperCase() : username.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                              <span className="user-fullname">
                                {profile ? profile.full_name : username}
                              </span>
                              <span className="user-username">@{username}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
              {showFollowing && (
                <div className="connection-list">
                  <h4 className="connection-title">People you follow</h4>
                  
                  {following.length === 0 ? (
                    <p className="no-connections">You aren't following anyone yet.</p>
                  ) : (
                    <div className="users-grid">
                      {following.map(username => {
                        const profile = userProfiles[username];
                        return (
                          <div 
                            key={username} 
                            className="user-item"
                            onClick={() => handleNavigateToUser(username)}
                          >
                            <div className="user-avatar-small">
                              {profile ? profile.full_name.charAt(0).toUpperCase() : username.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                              <span className="user-fullname">
                                {profile ? profile.full_name : username}
                              </span>
                              <span className="user-username">@{username}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
              {!showFollowers && !showFollowing && (
                <p className="connection-prompt">
                  Click on Followers or Following to see your connections.
                </p>
              )}
            </div>
          </div>
          
          <div className="profile-actions">
            <button 
              className="logout-btn" 
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile; 