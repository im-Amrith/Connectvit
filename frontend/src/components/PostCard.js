import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './PostCard.css';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

function PostCard({ post }) {
  const { currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(
    post.likes?.includes(currentUser?.username) || false
  );
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const navigate = useNavigate();

  const handleLike = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010';
      
      const response = await fetch(`${API_URL}/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser.username
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with the new likes list from server
        const newLikes = data.likes;
        const userLiked = newLikes.includes(currentUser.username);
        
        setIsLiked(userLiked);
        setLikesCount(newLikes.length);
        
        // Create notification if needed (this part remains client-side for now, 
        // but ideally should be handled by backend)
        if (userLiked && post.username !== currentUser.username) {
           // createLikeNotification(post); // Keeping existing logic if it exists
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleComment = (e) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    try {
      // Get all posts
      const savedPosts = localStorage.getItem('posts');
      const posts = savedPosts ? JSON.parse(savedPosts) : [];
      
      // Find current post
      const postIndex = posts.findIndex(p => p.id === post.id);
      if (postIndex === -1) return;
      
      // Create new comment
      const newComment = {
        id: Date.now().toString(),
        username: currentUser.username,
        userFullName: currentUser.full_name,
        text: comment.trim(),
        timestamp: new Date().toISOString()
      };
      
      // Add comment to post
      const updatedPost = { ...posts[postIndex] };
      if (!updatedPost.comments) updatedPost.comments = [];
      updatedPost.comments = [...updatedPost.comments, newComment];
      
      // Update posts array
      posts[postIndex] = updatedPost;
      
      // Save updated posts
      localStorage.setItem('posts', JSON.stringify(posts));
      
      // Reset comment input
      setComment('');
      
      // Create notification for post owner (if not the current user)
      if (updatedPost.username !== currentUser.username) {
        createCommentNotification(updatedPost, newComment);
      }
      
      // Show comments after adding a new one
      setShowComments(true);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const createLikeNotification = (post) => {
    try {
      // Get existing notifications
      const savedNotifications = localStorage.getItem('notifications');
      const notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
      
      // Create new notification
      const newNotification = {
        id: Date.now().toString(),
        type: 'like',
        sender: currentUser.username,
        senderName: currentUser.full_name,
        recipient: post.username,
        postId: post.id,
        message: `${currentUser.full_name} liked your post`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      // Save notification
      localStorage.setItem('notifications', JSON.stringify([...notifications, newNotification]));
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const createCommentNotification = (post, comment) => {
    try {
      // Get existing notifications
      const savedNotifications = localStorage.getItem('notifications');
      const notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
      
      // Create new notification
      const newNotification = {
        id: Date.now().toString(),
        type: 'comment',
        sender: currentUser.username,
        senderName: currentUser.full_name,
        recipient: post.username,
        postId: post.id,
        commentId: comment.id,
        message: `${currentUser.full_name} commented on your post: "${comment.text.substring(0, 30)}${comment.text.length > 30 ? '...' : ''}"`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      // Save notification
      localStorage.setItem('notifications', JSON.stringify([...notifications, newNotification]));
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'some time ago';
    }
  };

  const navigateToProfile = () => {
    navigate(`/profile/${post.username}`);
  };

  return (
    <div className="post-card">
      <div className="post-header" onClick={navigateToProfile}>
        <div className="post-avatar">
          {post.userFullName ? post.userFullName.charAt(0).toUpperCase() : post.username.charAt(0).toUpperCase()}
        </div>
        <div className="post-user-info">
          <div className="post-username">{post.userFullName || post.username}</div>
          <div className="post-timestamp">{formatTime(post.timestamp)}</div>
        </div>
      </div>
      
      <div className="post-image-container">
        <img src={post.image_url || post.imageUrl} alt="Post" className="post-image" />
      </div>
      
      <div className="post-actions">
        <button 
          className={`post-action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          {isLiked ? '❤️' : '🤍'} {likesCount > 0 && likesCount}
        </button>
        <button 
          className="post-action-btn"
          onClick={() => setShowComments(!showComments)}
        >
          💬 {post.comments && post.comments.length > 0 && post.comments.length}
        </button>
      </div>
      
      <div className="post-caption">
        <span className="post-caption-username">@{post.username}</span> {post.caption}
      </div>
      
      {showComments && (
        <div className="post-comments">
          {post.comments && post.comments.length > 0 ? (
            <div className="comments-list">
              {post.comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-user" onClick={() => navigate(`/profile/${comment.username}`)}>
                    @{comment.username}
                  </div>
                  <div className="comment-text">{comment.text}</div>
                  <div className="comment-timestamp">{formatTime(comment.timestamp)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-comments">No comments yet</div>
          )}
          
          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              className="comment-input"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button 
              type="submit" 
              className="comment-submit-btn"
              disabled={!comment.trim()}
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default PostCard; 