import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, AlertTriangle, Key } from 'lucide-react';

const AuthPage = () => {
  const { login, signup, error: authError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('analyst@ecocorp.com');
  const [loginPassword, setLoginPassword] = useState('analyst123');

  // Register Form States
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('Manufacturing');
  const [region, setRegion] = useState('North America');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Password Recovery State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await signup({
        orgName,
        industry,
        region,
        name: regName,
        email: regEmail,
        password: regPassword
      });
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          setShowForgot(false);
          setSuccessMsg('');
        }, 3000);
      } else {
        setErrorMsg(data.error || 'Failed to dispatch reset link');
      }
    } catch (err) {
      setErrorMsg('Failed to process password recovery');
    } finally {
      setLoading(false);
    }
  };

  const autoFillAccount = (role) => {
    if (role === 'analyst') {
      setLoginEmail('analyst@ecocorp.com');
      setLoginPassword('analyst123');
    } else if (role === 'admin') {
      setLoginEmail('admin@ecocorp.com');
      setLoginPassword('admin123');
    } else if (role === 'auditor') {
      setLoginEmail('auditor@ecocorp.com');
      setLoginPassword('auditor123');
    }
  };

  return (
    <div style={styles.authWrapper}>
      <div style={styles.brandingBox}>
        <div style={styles.logoRow}>
          <Shield size={32} color="#10b981" />
          <span style={styles.brandTitle}>Breathe ESG</span>
        </div>
        <h2 style={styles.brandingHeadline}>Enterprise Ingestion & Audit Compliance</h2>
        <p style={styles.brandingSubline}>
          Standardize environmental ledgers, audit raw SAP streams, map utility invoicing intervals, and verify business travel carbon offsets.
        </p>
      </div>

      <div className="glass-card" style={styles.authCard}>
        {showForgot ? (
          <div>
            <div style={styles.cardHeader}>
              <Key size={24} color="#10b981" />
              <h3>Forgot Password</h3>
            </div>
            <p style={styles.cardSubtitle}>Submit your registered email. We will dispatch a recovery ticket.</p>
            
            <form onSubmit={handleForgotSubmit} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>

              {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
              {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Dispatched...' : 'Send Recovery Ticket'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem' }}
                onClick={() => { setShowForgot(false); setErrorMsg(''); }}
              >
                Back to Login
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div style={styles.tabHeader}>
              <button
                style={{ ...styles.tabBtn, ...(isRegister ? {} : styles.activeTab) }}
                onClick={() => { setIsRegister(false); setErrorMsg(''); }}
              >
                Sign In
              </button>
              <button
                style={{ ...styles.tabBtn, ...(isRegister ? styles.activeTab : {}) }}
                onClick={() => { setIsRegister(true); setErrorMsg(''); }}
              >
                Register Org
              </button>
            </div>

            {errorMsg && <div style={styles.errorAlert}><AlertTriangle size={16} />{errorMsg}</div>}

            {!isRegister ? (
              // Login Panel
              <form onSubmit={handleLoginSubmit} style={{ marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Corporate Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="analyst@ecocorp.com"
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

                <div style={styles.forgotRow}>
                  <button type="button" style={styles.forgotBtn} onClick={() => setShowForgot(true)}>
                    Forgot password?
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} disabled={loading}>
                  {loading ? 'Validating credentials...' : 'Enter Console'}
                </button>

                <div style={styles.demoAccounts}>
                  <p style={styles.demoTitle}><Sparkles size={12} color="#10b981" /> Seeded Accounts (Quick Autofill)</p>
                  <div style={styles.demoButtonGrid}>
                    <button type="button" style={styles.demoBtn} onClick={() => autoFillAccount('analyst')}>ESG Analyst</button>
                    <button type="button" style={styles.demoBtn} onClick={() => autoFillAccount('admin')}>Org Admin</button>
                    <button type="button" style={styles.demoBtn} onClick={() => autoFillAccount('auditor')}>Auditor</button>
                  </div>
                </div>
              </form>
            ) : (
              // Registration Panel
              <form onSubmit={handleRegisterSubmit} style={{ marginTop: '1.5rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
                <h4 style={styles.sectionHeading}>Organization Profile</h4>
                <div className="form-group">
                  <label className="form-label">Tenant Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Carbon Labs"
                    required
                  />
                </div>
                <div className="form-group" style={styles.rowLayout}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Industry</label>
                    <select className="form-input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                      <option>Manufacturing</option>
                      <option>Technology</option>
                      <option>Logistics</option>
                      <option>Energy & Utilities</option>
                      <option>Retail</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Region</label>
                    <select className="form-input" value={region} onChange={(e) => setRegion(e.target.value)}>
                      <option>North America</option>
                      <option>Europe</option>
                      <option>Asia-Pacific</option>
                      <option>Global</option>
                    </select>
                  </div>
                </div>

                <h4 style={styles.sectionHeading} style={{ marginTop: '1.5rem' }}>Administrator Credentials</h4>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Sarah Jenkins"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="admin@company.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="min 6 characters"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} disabled={loading}>
                  {loading ? 'Creating workspace...' : 'Initialize Tenant'}
                </button>
              </form>
            )}
          </div>
        )}
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
    background: 'radial-gradient(circle at 70% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 45%), #050811',
    gap: '4rem'
  },
  brandingBox: {
    maxWidth: '460px',
    animation: 'fadeIn 0.5s ease-out forwards'
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  brandTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: '-0.03em'
  },
  brandingHeadline: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#f1f5f9',
    lineHeight: '1.2',
    marginBottom: '1rem',
    fontFamily: 'Outfit, sans-serif'
  },
  brandingSubline: {
    fontSize: '1rem',
    color: '#94a3b8',
    lineHeight: '1.6'
  },
  authCard: {
    width: '460px',
    padding: '2.5rem',
    border: '1px solid rgba(30, 41, 59, 0.8)',
    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8)'
  },
  tabHeader: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    marginBottom: '1rem'
  },
  tabBtn: {
    flex: 1,
    background: 'none',
    border: 'none',
    paddingBottom: '1rem',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s ease'
  },
  activeTab: {
    color: '#10b981',
    borderBottom: '2px solid #10b981'
  },
  forgotRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '-0.5rem'
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  demoAccounts: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px dashed #1e293b'
  },
  demoTitle: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginBottom: '0.75rem'
  },
  demoButtonGrid: {
    display: 'flex',
    gap: '0.5rem'
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#101726',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '0.4rem',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '0.75rem',
    fontSize: '0.8rem',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '6px',
    padding: '0.75rem',
    fontSize: '0.8rem',
    marginTop: '1rem'
  },
  rowLayout: {
    display: 'flex',
    gap: '1rem'
  },
  sectionHeading: {
    color: '#10b981',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '700',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '0.25rem',
    marginBottom: '1rem'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: '0.8rem',
    lineHeight: '1.4'
  }
};

export default AuthPage;
