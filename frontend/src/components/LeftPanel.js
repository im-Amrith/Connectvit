import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './utils.css';
import logo from '../images/logo.png';
import home from '../images/home.png';
import searchIcon from '../images/searchIcon.png';
import bellIcon from '../images/bellIcon.png';
import chatIcon from '../images/chatIcon.png';
import studyGroupIcon from '../images/study-group-logo.png';
import profileIcon from '../images/user.png';

const navItems = [
  { id: 'home', label: 'Home', path: '/home', icon: home },
  { id: 'create', label: 'Share a Moment', path: '/create', iconText: '+' },
  { id: 'search', label: 'Search', path: '/search', icon: searchIcon },
  { id: 'notifications', label: 'Notifications', path: '/notifications', icon: bellIcon },
  { id: 'chats', label: 'Chats', path: '/chats', icon: chatIcon },
  { id: 'groups', label: 'Study Groups', path: '/groups', icon: studyGroupIcon },
  { id: 'profile', label: 'Profile', path: '/profile', icon: profileIcon },
];

export default function LeftPanel() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const currentPath = location.pathname;

  const getInitials = () => {
    if (currentUser?.full_name) {
      return currentUser.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (currentUser?.username) {
      return currentUser.username.slice(0, 2).toUpperCase();
    }
    return 'CV';
  };

  return (
    <aside className="left-container">
      <Link to="/home" className="brand-lockup">
        <img src={logo} alt="ConnectVIT" width="60" height="40" className="brand-logo" />
        <div className="brand-meta">
          <span className="brand-title">ConnectVIT</span>
          <p className="brand-tagline">University Network</p>
        </div>
      </Link>

      <nav className="left-nav">
        {navItems.map(item => (
          <Link
            key={item.id}
            to={item.path}
            className={`nav-pill ${currentPath.startsWith(item.path) ? 'is-active' : ''}`}
          >
            {item.icon ? (
              <span className="nav-icon">
                <img src={item.icon} alt={item.label} />
              </span>
            ) : (
              <span className="nav-icon nav-icon-text">{item.iconText || '+'}</span>
            )}
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="left-panel-card">
        <div className="left-panel-user">
          <div className="left-panel-avatar">{getInitials()}</div>
          <div className="left-panel-meta">
            <p>{currentUser?.full_name || 'Guest Student'}</p>
            <span>@{currentUser?.username || 'vitian'}</span>
          </div>
        </div>
        <p className="left-panel-quote">
          “Connect with study groups, mentors, and events curated for VIT.”
        </p>
      </div>
    </aside>
  );
}
