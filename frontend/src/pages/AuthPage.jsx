import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle } from 'lucide-react';

const AuthPage = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authWrapper}>
      <div className="glass-card" style={styles.authCard}>
        <div style={styles.logoRow}>
          <Shield size={32} color="#10b981" />
          <span style={styles.brandTitle}>Breathe ESG</span>
        </div>
        
        <h3 style={styles.cardTitle}>Sign In</h3>
        <p style={styles.cardSubtitle}>Enter your corporate credentials to access the analyst console.</p>

        {errorMsg && (
          <div style={styles.errorAlert}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} style={{ marginTop: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Corporate Email</label>
            <input
              type="email"
              className="form-input"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="e.g. analyst@ecocorp.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Secret Password</label>
            <input
              type="password"
              className="form-input"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} disabled={loading}>
            {loading ? 'Validating credentials...' : 'Enter Console'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  authWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '2rem',
    background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), #050811',
  },
  authCard: {
    width: '420px',
    padding: '2.5rem',
    backgroundColor: 'rgba(17, 25, 42, 0.8)',
    border: '1px solid #1e293b',
    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8)',
    borderRadius: '14px',
    backdropFilter: 'blur(12px)'
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem'
  },
  brandTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: '-0.03em'
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif',
    textAlign: 'center',
    marginBottom: '0.25rem'
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: '0.8rem',
    lineHeight: '1.4',
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '0.75rem',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  }
};

export default AuthPage;
