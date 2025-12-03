// import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import Home from './pages/Home'

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import LeftPanel from '../components/LeftPanel';
import Stories from '../components/Stories';
import RightPanel from '../components/RightPanel';
import HomeFeed from '../components/HomeFeed';
import '../components/utils.css';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="home-shell">
      <div className="home-backdrop">
        <span className="aurora aurora-one" />
        <span className="aurora aurora-two" />
        <span className="aurora aurora-three" />
      </div>

      <div className="page-container home-page-grid">
        <LeftPanel />
        <div className="main-content">
          <Stories />
          <HomeFeed />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}

export default Home;
