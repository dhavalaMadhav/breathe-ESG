import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, AlertTriangle, Sparkles, CheckCircle } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    // Simulate standard animation delay for validating
    setTimeout(() => {
      const isSuccess = onLogin(username, password);
      if (isSuccess) {
        setSuccess(true);
      } else {
        setErrorMsg('Invalid username or password. Check demo credentials below.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div style={styles.container}>
      {/* Background Ambient Glows */}
      <div style={styles.glowTop}></div>
      <div style={styles.glowBottom}></div>

      {/* Main Glassmorphic Card Container */}
      <div className="glass-card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <img src="/logo.png" alt="Breathe ESG Logo" style={{ height: '40px', width: 'auto', display: 'block' }} />
            <h1 style={styles.brandName}>Breathe ESG</h1>
          </div>
          <p style={styles.subtitle}>Environmental Ledger Analyst Console</p>
        </div>

        {/* Input credentials alert feedback */}
        {errorMsg && (
          <div style={styles.errorAlert}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <CheckCircle size={16} />
            <span>Access granted! Loading analyst dashboard...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Username</label>
            <div style={styles.inputWrapper}>
              <User size={16} style={styles.inputIcon} />
              <input
                type="text"
                className="form-input"
                style={styles.inputWithIcon}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Secret Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={styles.inputWithIcon}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || success}
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || success}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading || success}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={styles.smallSpinner}></span>
                Verifying...
              </span>
            ) : success ? (
              'Authorized'
            ) : (
              'Enter Console'
            )}
          </button>
        </form>

        {/* Demo Credentials Drawer Info */}
        <div style={styles.demoBox}>
          <div style={styles.demoTitle}>
            <Sparkles size={12} color="#10b981" />
            <span>Seeded Demo Credentials</span>
          </div>
          <div style={styles.demoDetails}>
            <div style={styles.demoRow}>
              <span style={styles.demoLabel}>Username:</span>
              <code style={styles.demoCode}>madhav</code>
            </div>
            <div style={styles.demoRow}>
              <span style={styles.demoLabel}>Password:</span>
              <code style={styles.demoCode}>Madhav@3365</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '2rem',
    background: 'radial-gradient(circle at center, #0f0f10 0%, #050505 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
  },
  glowTop: {
    position: 'absolute',
    top: '-20%',
    right: '-10%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute',
    bottom: '-20%',
    left: '-10%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.02) 0%, transparent 70%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '2.5rem',
    zIndex: 10,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    border: '1px solid rgba(36, 36, 38, 1)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(12px)',
    animation: 'fadeIn 0.5s ease-out forwards',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  brandName: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: '-0.03em',
    fontFamily: "'Outfit', sans-serif",
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#64748b',
    pointerEvents: 'none',
  },
  inputWithIcon: {
    paddingLeft: '2.5rem',
    paddingRight: '2.5rem',
    width: '100%',
    backgroundColor: '#161616',
    border: '1px solid #242426',
    borderRadius: '8px',
    paddingTop: '0.75rem',
    paddingBottom: '0.75rem',
    color: '#f8fafc',
    fontSize: '0.95rem',
    transition: 'all 0.3s ease',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  submitBtn: {
    width: '100%',
    marginTop: '0.5rem',
    padding: '0.8rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    borderRadius: '8px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    borderWidth: '2px',
    margin: 0,
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.8rem',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    lineHeight: '1.4',
    animation: 'fadeIn 0.3s ease-out forwards',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.8rem',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    lineHeight: '1.4',
    animation: 'fadeIn 0.3s ease-out forwards',
  },
  demoBox: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px dashed #242426',
  },
  demoTitle: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    marginBottom: '0.75rem',
  },
  demoDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    backgroundColor: 'rgba(22, 22, 22, 0.4)',
    border: '1px solid #1c1c1e',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
  },
  demoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
  },
  demoLabel: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  demoCode: {
    fontFamily: "monospace",
    backgroundColor: '#0a0a0c',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    color: '#10b981',
    border: '1px solid #1c1c1e',
    fontSize: '0.8rem',
    fontWeight: '700',
  },
};

export default LoginPage;
