import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import './CreatePost.css';

function CreatePost({ onPostCreated }) {
  const [caption, setCaption] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileReader = new FileReader();
      
      fileReader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      
      fileReader.readAsDataURL(file);
      
      // For simplicity in this demo, we're storing the file as base64
      // In a real app, you'd upload this to a server
      // Instead, we'll just pretend it's a valid URL
      setImageURL(`data:${file.type};base64,${file.name}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imagePreview) {
      setError('Please select an image');
      return;
    }
    
    if (!caption.trim()) {
      setError('Please add a caption');
      return;
    }
    
    setLoading(true);
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010';
      
      const response = await fetch(`${API_URL}/api/posts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser.username,
          caption: caption,
          image_url: imageURL
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (onPostCreated) {
          onPostCreated(data.post);
        }
        
        // Reset form
        setCaption('');
        setImageURL('');
        setImagePreview(null);
        setError('');
      } else {
        setError('Failed to create post');
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError('Failed to create post');
    } finally {
      setLoading(false);
    }
  };
  
  const createFollowersNotifications = (post) => {
    try {
      // Get followers list
      const followersData = localStorage.getItem(`followers_${currentUser.username}`);
      if (!followersData) return;
      
      const followers = JSON.parse(followersData);
      
      // Get existing notifications
      const savedNotifications = localStorage.getItem('notifications');
      const notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
      
      // Create notifications for each follower
      const newNotifications = followers.map(followerUsername => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        type: 'post',
        sender: currentUser.username,
        senderName: currentUser.full_name,
        recipient: followerUsername,
        postId: post.id,
        message: `${currentUser.full_name} shared a new post`,
        timestamp: new Date().toISOString(),
        read: false
      }));
      
      // Save notifications
      localStorage.setItem('notifications', JSON.stringify([...notifications, ...newNotifications]));
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  };

  return (
    <div className="create-post-container">
      <h3 className="create-post-title">Share a Moment</h3>
      
      {error && <div className="create-post-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="create-post-form">
        <div className="image-upload-container">
          {imagePreview ? (
            <div className="image-preview-container">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="image-preview" 
              />
              <button 
                type="button" 
                className="remove-image-btn"
                onClick={() => {
                  setImagePreview(null);
                  setImageURL('');
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="image-upload-placeholder">
              <label htmlFor="image-upload" className="image-upload-label">
                <div className="upload-icon">📷</div>
                <span>Click to upload an image</span>
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="image-upload-input"
                />
              </label>
            </div>
          )}
        </div>
        
        <textarea
          className="caption-input"
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
        />
        
        <button 
          type="submit" 
          className="create-post-btn"
          disabled={loading || !imagePreview}
        >
          {loading ? 'Posting...' : 'Share Post'}
        </button>
      </form>
    </div>
  );
}

export default CreatePost; 