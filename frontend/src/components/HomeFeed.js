import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import PostCard from './PostCard';
import './HomeFeed.css';

export default function HomeFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    loadPosts();
  }, [currentUser]);

  const loadPosts = () => {
    try {
      setLoading(true);
      
      const savedPosts = localStorage.getItem('posts');
      const allPosts = savedPosts ? JSON.parse(savedPosts) : [];
      
      allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setPosts(allPosts);
      setLoading(false);
    } catch (error) {
      console.error('Error loading posts:', error);
      setLoading(false);
    }
  };

  return (
    <div className="home-feed">
      <div className="feed-container">
        {loading ? (
          <div className="posts-loading">Loading posts...</div>
        ) : posts.length > 0 ? (
          <div className="posts-container">
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="no-posts">
            <div className="no-posts-icon">📷</div>
            <h3 className="no-posts-title">No Posts Yet</h3>
            <p className="no-posts-message">
              {currentUser 
                ? "Be the first to share something with your peers!"
                : "Log in to see posts from across campus."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
