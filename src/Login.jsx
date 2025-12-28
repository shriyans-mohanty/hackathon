import React, { useState } from 'react';
import { Home } from 'lucide-react';

const GovernmentLogin = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:5000';

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userEmail', email);
        window.location.href = '/gov-dashboard';
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Cannot connect to server. Please make sure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    if (!email.endsWith('@gov.in')) {
      setError('Please use a valid government email (@gov.in)');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/signup/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = `/create-password?token=${data.token}`;
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Cannot connect to server. Please make sure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      if (activeTab === 'login') {
        handleLogin();
      } else {
        handleSignup();
      }
    }
  };

  return (
    <div style={styles.body}>
      {/* Home Button */}
      <button style={styles.homeButton} onClick={() => window.location.href = '/'}>
        <Home size={20} />
        <span>Back to Home</span>
      </button>

      <div style={styles.container}>
        <div style={styles.shieldIcon}>🛡</div>
        <h1 style={styles.h1}>AQI Monitor System</h1>
        <p style={styles.subtitle}>Government Employee Portal</p>

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'login' ? styles.tabActive : {})
            }}
            onClick={() => {
              setActiveTab('login');
              setError('');
              setPassword('');
            }}
          >
            Login
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'signup' ? styles.tabActive : {})
            }}
            onClick={() => {
              setActiveTab('signup');
              setError('');
              setPassword('');
            }}
          >
            Sign Up
          </button>
        </div>

        <div style={styles.formSection}>
          <label style={styles.label}>Official Email</label>
          <div style={styles.inputWrapper}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="employee@gov.in"
              style={styles.input}
            />
            <span style={styles.inputIcon}>👤</span>
          </div>

          {activeTab === 'login' && (
            <>
              <label style={{...styles.label, marginTop: '20px'}}>Password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                  style={styles.input}
                />
                <button
                  type="button"
                  style={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  👁
                </button>
              </div>
            </>
          )}

          {error && (
            <div style={styles.errorMessage}>
              <span style={styles.errorIcon}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={activeTab === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            style={{
              ...styles.createBtn,
              ...(loading ? styles.createBtnDisabled : {})
            }}
          >
            {loading ? 'Please wait...' : (activeTab === 'login' ? 'Login' : 'Create Account')}
          </button>

          {activeTab === 'login' && (
            <p style={styles.helpText}>
              Don't have an account? Click <strong>Sign Up</strong> above
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    background: '#000000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    margin: 0,
    position: 'relative',
  },
  homeButton: {
    position: 'absolute',
    top: '30px',
    left: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid #333',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
    zIndex: 10,
  },
  container: {
    background: '#1a1a1a',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '660px',
    border: '1px solid #333',
  },
  shieldIcon: {
    width: '64px',
    height: '64px',
    margin: '0 auto 24px',
    background: 'linear-gradient(135deg, #4a9eff 0%, #357abd 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
  },
  h1: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: '32px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#999',
    textAlign: 'center',
    fontSize: '16px',
    marginBottom: '40px',
  },
  tabs: {
    display: 'flex',
    gap: 0,
    marginBottom: '32px',
    background: '#2a2a2a',
    borderRadius: '8px',
    padding: '4px',
  },
  tab: {
    flex: 1,
    padding: '12px 24px',
    border: 'none',
    background: 'transparent',
    color: '#999',
    fontSize: '16px',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.3s',
  },
  tabActive: {
    background: '#ffffff',
    color: '#000000',
    fontWeight: '500',
  },
  formSection: {
    marginTop: '24px',
  },
  label: {
    display: 'block',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '14px 46px 14px 16px',
    background: '#000000',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  inputIcon: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '20px',
  },
  togglePassword: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '4px',
  },
  errorMessage: {
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid #ff4444',
    borderRadius: '8px',
    padding: '14px 16px',
    color: '#ff4444',
    fontSize: '14px',
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorIcon: {
    fontSize: '18px',
  },
  createBtn: {
    width: '100%',
    padding: '16px',
    background: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    color: '#000000',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '32px',
  },
  createBtnDisabled: {
    background: '#2a2a2a',
    color: '#666',
    cursor: 'not-allowed',
  },
  helpText: {
    color: '#999',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '16px',
  },
};

export default GovernmentLogin;