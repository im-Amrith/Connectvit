import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import logo from '../images/logo.png';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Check if already logged in, but add a flag to prevent unwanted redirects
  useEffect(() => {
    let isMounted = true;
    
    setTimeout(() => {
      if (isMounted && autoRedirect && isAuthenticated) {
        navigate('/home');
      }
      // After initial check, disable auto-redirect
      if (isMounted) setAutoRedirect(false);
    }, 800);
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, navigate, autoRedirect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/home');
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error('Login Error:', error);
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // If the component still thinks it should redirect automatically
  // but we've turned that off, show a loading state
  if (autoRedirect && isAuthenticated) {
    return <div className="loading-page">Redirecting...</div>;
  }

  return (
    <div className="login-container" style={containerWrapperStyle}>
      <div className='form-container' style={containerStyle}>
        <div className="login-card" style={formContainerStyle}>
          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={logoContainer}>
              <img src={logo} alt="Logo" style={logoImg} />
              <h1 style={titleStyle}>Login</h1>
            </div>
            
            {error && <div style={errorStyle}>{error}</div>}
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Username</label>
              <input 
                type='text' 
                placeholder='Enter your username' 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                style={inputStyle} 
              />
            </div>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password</label>
              <input 
                type='password' 
                placeholder='Enter your password' 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={inputStyle} 
              />
            </div>
            
            <button 
              type='submit' 
              style={loading ? {...buttonStyle, ...buttonLoadingStyle} : buttonStyle}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            
            <div style={dividerContainer}>
              <hr style={dividerLine} />
              <span style={dividerText}>or</span>
              <hr style={dividerLine} />
            </div>
            
            <p style={bottomText}>
              Don't have an account? <a style={linkStyle} href='/signup'>Sign Up</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// Enhanced Styles
const containerWrapperStyle = {
  width: '100%',
  height: '100vh',
  position: 'relative',
  backgroundColor: 'black',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  zIndex: 5
};

const formContainerStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  overflow: 'hidden',
  width: '380px',
  transition: 'all 0.3s ease'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  padding: '30px',
};

const logoContainer = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '25px'
};

const logoImg = {
  width: '90px',
  marginBottom: '15px',
  filter: 'drop-shadow(0 0 10px rgba(24, 144, 255, 0.5))'
};

const titleStyle = {
  color: 'white',
  margin: '0',
  fontSize: '28px',
  fontWeight: '500',
  letterSpacing: '1px',
  background: 'linear-gradient(to right, #30CFD0, #5271C4)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const inputGroupStyle = {
  marginBottom: '20px',
  display: 'flex',
  flexDirection: 'column'
};

const labelStyle = {
  color: '#ccc',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: '500'
};

const inputStyle = {
  padding: '12px 15px',
  fontSize: '16px',
  border: '1px solid #333',
  borderRadius: '8px',
  backgroundColor: 'rgba(20, 20, 20, 0.8)',
  color: 'white',
  transition: 'all 0.3s ease',
  outline: 'none',
  '&:focus': {
    borderColor: '#1890ff',
    boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)'
  }
};

const buttonStyle = {
  padding: '12px',
  fontSize: '16px',
  backgroundColor: '#1890ff',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontWeight: '500',
  marginTop: '10px',
  backgroundImage: 'linear-gradient(to right, #1890ff, #36bcf7)'
};

const buttonLoadingStyle = {
  opacity: '0.7'
};

const dividerContainer = {
  display: 'flex',
  alignItems: 'center',
  margin: '25px 0 15px',
  position: 'relative'
};

const dividerLine = {
  flex: '1',
  height: '1px',
  backgroundColor: '#333',
  border: 'none'
};

const dividerText = {
  color: '#999',
  padding: '0 15px',
  fontSize: '14px'
};

const bottomText = {
  textAlign: 'center',
  color: '#aaa',
  fontSize: '14px',
  margin: '10px 0 0'
};

const linkStyle = {
  color: '#1890ff',
  fontWeight: 'bold',
  textDecoration: 'none',
  position: 'relative',
  transition: 'all 0.3s ease'
};

const errorStyle = {
  color: '#ff4d4f',
  textAlign: 'center',
  marginBottom: '20px',
  padding: '10px',
  borderRadius: '8px',
  backgroundColor: 'rgba(255, 77, 79, 0.1)',
  border: '1px solid rgba(255, 77, 79, 0.2)',
  fontSize: '14px'
};

export default Login;
