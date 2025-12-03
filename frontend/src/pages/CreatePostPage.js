import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LeftPanel from '../components/LeftPanel';
import RightPanel from '../components/RightPanel';
import CreatePost from '../components/CreatePost';
import { useAuth } from '../components/AuthContext';
import './CreatePostPage.css';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handlePostCreated = () => {
    navigate('/home');
  };

  return (
    <div className="page-container create-post-page">
      <LeftPanel />
      <main className="create-post-main">
        <section className="create-post-hero">
          <p className="create-post-kicker">ConnectVIT Stories</p>
          <h1>Share a Moment</h1>
          <p className="create-post-subtitle">
            Capture a highlight from campus life, club events, or your latest project
            so everyone across the university can see it in the home feed.
          </p>
        </section>

        <CreatePost onPostCreated={handlePostCreated} />
      </main>
      <RightPanel />
    </div>
  );
}

