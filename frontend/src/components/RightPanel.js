import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './RightPanel.css';

const trendingTopics = [
    { tag: '#VITHacks', posts: '2.1K mentions' },
    { tag: '#CampusLife', posts: '1.4K mentions' },
    { tag: '#AIResearch', posts: '980 mentions' },
    { tag: '#StudySprint', posts: '860 mentions' },
];

const campusHighlights = [
    { title: 'Design Sprint', detail: 'Thu • 4:00 PM · XR Lab' },
    { title: 'Machine Learning Circle', detail: 'Fri • 6:30 PM · Block 7' },
    { title: 'Career Masterclass', detail: 'Sat • 10:00 AM · Audi 3' },
];

export default function RightPanel() {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState([]);
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!currentUser) return;
            
            try {
                setLoading(true);
                const response = await fetch('http://localhost:5010/api/users');
                
                if (response.ok) {
                    const users = await response.json();
                    
                    let followingList = [];
                    try {
                        const saved = localStorage.getItem(`following_${currentUser.username}`);
                        if (saved) {
                            followingList = JSON.parse(saved);
                            setFollowing(followingList);
                        }
                    } catch (error) {
                        console.error('Error loading following:', error);
                    }
                    
                    const filteredUsers = users
                        .filter(user => 
                            user.username !== currentUser.username && 
                            !followingList.includes(user.username)
                        )
                        .slice(0, 5);
                        
                    setSuggestions(filteredUsers);
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchSuggestions();
    }, [currentUser]);

    const handleFollow = (username, e) => {
        e.stopPropagation();
        if (!currentUser) return;
        
        try {
            let followingList = [...following];
            
            if (!followingList.includes(username)) {
                followingList.push(username);
            }
            
            localStorage.setItem(`following_${currentUser.username}`, JSON.stringify(followingList));
            setFollowing(followingList);
            
            let followersList = [];
            const saved = localStorage.getItem(`followers_${username}`);
            
            if (saved) {
                followersList = JSON.parse(saved);
            }
            
            if (!followersList.includes(currentUser.username)) {
                followersList.push(currentUser.username);
            }
            
            localStorage.setItem(`followers_${username}`, JSON.stringify(followersList));
            
            setSuggestions(suggestions.filter(user => user.username !== username));
        } catch (error) {
            console.error('Error updating follow status:', error);
        }
    };

    const navigateToProfile = (username) => {
        navigate(`/profile/${username}`);
    };

    return (
        <aside className="right-panel">
            {currentUser && (
                <div className="user-profile glass-card" onClick={() => navigate('/profile')}>
                    <div className="user-profile-details">
                        <div className="user-avatar">
                            {currentUser.full_name?.charAt(0).toUpperCase() || currentUser.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="user-info">
                            <div className="username">{currentUser.username}</div>
                            <div className="fullname">{currentUser.full_name}</div>
                        </div>
                    </div>
                    <button className="pill-button" type="button">
                        Switch
                    </button>
                </div>
            )}
            
            <div className="right-card glass-card">
                <div className="right-card-head">
                    <span>Suggestions For You</span>
                    <button className="see-all" onClick={() => navigate('/search')}>See all</button>
                </div>
                
                {loading ? (
                    <div className="suggestions-loading">Loading suggestions...</div>
                ) : suggestions.length > 0 ? (
                    <div className="suggestions-list">
                        {suggestions.map(user => (
                            <div 
                                key={user.username} 
                                className="suggestion-item"
                                onClick={() => navigateToProfile(user.username)}
                            >
                                <div className="user-avatar">
                                    {user.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="user-info">
                                    <div className="username">{user.username}</div>
                                    <div className="suggestion-reason">Suggested for you</div>
                                </div>
                                <button 
                                    className="follow-button"
                                    onClick={(e) => handleFollow(user.username, e)}
                                >
                                    Follow
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-suggestions">No suggestions available</div>
                )}
            </div>

            <div className="right-card glass-card">
                <div className="right-card-head">
                    <span>Trending Topics</span>
                </div>
                <div className="topic-list">
                    {trendingTopics.map(topic => (
                        <div key={topic.tag} className="topic-item">
                            <div>
                                <p className="topic-tag">{topic.tag}</p>
                                <span>{topic.posts}</span>
                            </div>
                            <button className="pill-button subtle" type="button">Join</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="right-card glass-card">
                <div className="right-card-head">
                    <span>Campus Highlights</span>
                </div>
                <div className="event-list">
                    {campusHighlights.map(event => (
                        <div key={event.title} className="event-item">
                            <p className="event-title">{event.title}</p>
                            <span className="event-detail">{event.detail}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="right-panel-footer">
                <div className="footer-links">
                    <a href="#">About</a> · 
                    <a href="#">Help</a> · 
                    <a href="#">Privacy</a> · 
                    <a href="#">Terms</a>
                </div>
                <div className="copyright">
                    © 2023 ConnectVIT
                </div>
            </div>
        </aside>
    );
}