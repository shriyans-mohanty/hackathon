import React, { useState } from 'react';

const CreatePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('AB7K9');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signup');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let captcha = '';
    for (let i = 0; i < 5; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return captcha;
  };

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput('');
  };

  const checkPasswordStrength = (pwd) => {
    const requirements = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };

    const strength = Object.values(requirements).filter(Boolean).length;
    const allMet = Object.values(requirements).every(met => met);

    return { requirements, strength, allMet };
  };

  const { requirements, strength, allMet } = checkPasswordStrength(password);

  const getStrengthClass = () => {
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const getStrengthText = () => {
    if (strength <= 2) return 'Weak';
    if (strength <= 4) return 'Medium';
    return 'Strong';
  };

  const isFormValid = () => {
    return (
      allMet &&
      password === confirmPassword &&
      password.length > 0 &&
      captchaInput.toUpperCase() === captchaCode
    );
  };

  const handleSubmit = async () => {
    setShowError(false);
    setLoading(true);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowError(true);
      setLoading(false);
      return;
    }

    if (captchaInput.toUpperCase() !== captchaCode) {
      setErrorMessage('Invalid CAPTCHA code');
      setShowError(true);
      setLoading(false);
      refreshCaptcha();
      return;
    }

    if (!allMet) {
      setErrorMessage('Password does not meet all requirements');
      setShowError(true);
      setLoading(false);
      return;
    }

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setErrorMessage('Invalid signup link. Please start the signup process again.');
      setShowError(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/signup/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userEmail', data.email);

        // Show success message
        alert('✅ Account created successfully! Redirecting to dashboard...');
        
        // Redirect based on role
        if (data.role === 'govt' || data.role === 'admin') {
          window.location.href = '/govt-dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setErrorMessage(data.message || 'Failed to create account');
        setShowError(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrorMessage('Cannot connect to server. Please make sure the backend is running.');
      setShowError(true);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isFormValid() && !loading) {
      handleSubmit();
    }
  };

  return (
    <div style={styles.body}>
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
            onClick={() => window.location.href = '/'}
          >
            Login
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'signup' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </button>
        </div>

        {showError && (
          <div style={styles.errorMessage}>
            <span style={styles.errorIcon}>⚠</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="password">
              Create Password
            </label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your password"
                autoComplete="new-password"
                style={styles.input}
                disabled={loading}
              />
              <button
                type="button"
                style={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                👁
              </button>
            </div>
            <div style={styles.passwordStrength}>
              <div style={styles.strengthBar}>
                <div
                  style={{
                    ...styles.strengthFill,
                    ...styles[`strength${getStrengthClass().charAt(0).toUpperCase() + getStrengthClass().slice(1)}`]
                  }}
                />
              </div>
              <div style={styles.strengthText}>
                Password strength: <span>{password ? getStrengthText() : '-'}</span>
              </div>
            </div>
            <div style={styles.requirements}>
              <div style={{...styles.requirement, ...(requirements.length ? styles.requirementMet : {})}}>
                {requirements.length ? '✓' : '○'} At least 8 characters
              </div>
              <div style={{...styles.requirement, ...(requirements.upper ? styles.requirementMet : {})}}>
                {requirements.upper ? '✓' : '○'} One uppercase letter
              </div>
              <div style={{...styles.requirement, ...(requirements.lower ? styles.requirementMet : {})}}>
                {requirements.lower ? '✓' : '○'} One lowercase letter
              </div>
              <div style={{...styles.requirement, ...(requirements.number ? styles.requirementMet : {})}}>
                {requirements.number ? '✓' : '○'} One number
              </div>
              <div style={{...styles.requirement, ...(requirements.special ? styles.requirementMet : {})}}>
                {requirements.special ? '✓' : '○'} One special character (!@#$%^&*)
              </div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="confirmPassword">
              Re-enter Password
            </label>
            <div style={styles.inputWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Confirm your password"
                autoComplete="new-password"
                style={styles.input}
                disabled={loading}
              />
              <button
                type="button"
                style={styles.togglePassword}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                👁
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <div style={styles.passwordMismatch}>
                ⚠ Passwords do not match
              </div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="captcha">
              Enter CAPTCHA
            </label>
            <div style={styles.captchaBox}>
              <div style={styles.captchaContent}>
                <div style={styles.captchaCode}>{captchaCode}</div>
                <button
                  type="button"
                  style={styles.refreshCaptcha}
                  onClick={refreshCaptcha}
                  disabled={loading}
                >
                  ↻
                </button>
              </div>
            </div>
            <input
              type="text"
              id="captcha"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter the code above"
              autoComplete="off"
              style={{...styles.input, marginTop: '12px'}}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSubmit}
            style={{
              ...styles.createBtn,
              ...(isFormValid() && !loading ? {} : styles.createBtnDisabled)
            }}
            disabled={!isFormValid() || loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p style={styles.helpText}>
            Already have an account? <a href="/" style={styles.link}>Login here</a>
          </p>
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
  formGroup: {
    marginBottom: '24px',
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
  passwordStrength: {
    marginTop: '8px',
    fontSize: '12px',
  },
  strengthBar: {
    height: '4px',
    background: '#2a2a2a',
    borderRadius: '2px',
    marginTop: '6px',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    transition: 'all 0.3s',
    borderRadius: '2px',
  },
  strengthWeak: {
    width: '33%',
    background: '#ff4444',
  },
  strengthMedium: {
    width: '66%',
    background: '#ffaa00',
  },
  strengthStrong: {
    width: '100%',
    background: '#00cc66',
  },
  strengthText: {
    color: '#999',
    marginTop: '4px',
  },
  requirements: {
    background: '#2a2a2a',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '8px',
  },
  requirement: {
    color: '#999',
    fontSize: '13px',
    margin: '6px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  requirementMet: {
    color: '#00cc66',
  },
  passwordMismatch: {
    color: '#ff4444',
    fontSize: '13px',
    marginTop: '8px',
  },
  captchaBox: {
    background: '#2a2a2a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  captchaContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  captchaCode: {
    background: '#000000',
    padding: '12px 20px',
    borderRadius: '6px',
    fontFamily: '"Courier New", monospace',
    fontSize: '24px',
    fontWeight: 'bold',
    letterSpacing: '8px',
    color: '#4a9eff',
    userSelect: 'none',
    textDecoration: 'line-through',
    textDecorationColor: '#666',
  },
  refreshCaptcha: {
    background: '#000000',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#999',
    cursor: 'pointer',
    padding: '8px 12px',
    fontSize: '20px',
    transition: 'all 0.3s',
  },
  errorMessage: {
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid #ff4444',
    borderRadius: '8px',
    padding: '14px 16px',
    color: '#ff4444',
    fontSize: '14px',
    marginBottom: '24px',
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
  link: {
    color: '#4a9eff',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

export default CreatePasswordPage;