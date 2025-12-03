import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LeftPanel from '../components/LeftPanel';
import { useAuth } from '../components/AuthContext';
import './Search.css';

function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (currentUser) {
      try {
        const saved = localStorage.getItem(`recent_searches_${currentUser.username}`);
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, [currentUser]);

  // Load suggested users
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5010/api/users');
        if (response.ok) {
          const users = await response.json();
          // Filter out current user and limit to 6 suggestions
          const filteredUsers = users
            .filter(user => user.username !== currentUser?.username)
            .slice(0, 6);
          setSuggestions(filteredUsers);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchSuggestions();
    }
  }, [isAuthenticated, currentUser]);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5010/api/users`);
      
      if (response.ok) {
        const users = await response.json();
        // Filter users based on search query
        const results = users.filter(user => 
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        setSearchResults(results);
        
        // Add to recent searches
        if (currentUser && results.length > 0) {
          const updatedSearches = [...recentSearches];
          
          // Add the query to recent searches if not already there
          if (!updatedSearches.includes(searchQuery)) {
            updatedSearches.unshift(searchQuery);
            // Keep only the last 5 searches
            if (updatedSearches.length > 5) {
              updatedSearches.pop();
            }
            
            setRecentSearches(updatedSearches);
            localStorage.setItem(
              `recent_searches_${currentUser.username}`, 
              JSON.stringify(updatedSearches)
            );
          }
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (currentUser) {
      localStorage.removeItem(`recent_searches_${currentUser.username}`);
    }
  };

  const handleUserClick = (username) => {
    navigate(`/profile/${username}`);
  };

  return (
    <div className="page-container">
      <LeftPanel />
      
      <div className="search-container">
        <div className="search-section">
          <h2 className="search-title">Search</h2>
          
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for users..."
              className="search-input"
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </form>
          
          {loading && <div className="search-loading">Loading...</div>}
          
          {searchQuery ? (
            <div className="search-results">
              <h3 className="results-title">Search Results</h3>
              
              {searchResults.length > 0 ? (
                <div className="user-grid">
                  {searchResults.map(user => (
                    <div 
                      key={user.username} 
                      className="user-card"
                      onClick={() => handleUserClick(user.username)}
                    >
                      <div className="user-avatar">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <h4 className="user-name">{user.full_name}</h4>
                        <p className="user-username">@{user.username}</p>
                      </div>
                      <button className="follow-button">Follow</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-results">No users found.</p>
              )}
            </div>
          ) : (
            <>
              {recentSearches.length > 0 && (
                <div className="recent-searches">
                  <div className="recent-header">
                    <h3 className="recent-title">Recent Searches</h3>
                    <button 
                      className="clear-button" 
                      onClick={clearRecentSearches}
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div className="recent-list">
                    {recentSearches.map((query, index) => (
                      <div key={index} className="recent-item" onClick={() => setSearchQuery(query)}>
                        <div className="recent-query">{query}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="suggestions-section">
                <h3 className="suggestions-title">Suggested for You</h3>
                
                <div className="user-grid">
                  {suggestions.map(user => (
                    <div 
                      key={user.username} 
                      className="user-card"
                      onClick={() => handleUserClick(user.username)}
                    >
                      <div className="user-avatar">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <h4 className="user-name">{user.full_name}</h4>
                        <p className="user-username">@{user.username}</p>
                      </div>
                      <button className="follow-button">Follow</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Search;