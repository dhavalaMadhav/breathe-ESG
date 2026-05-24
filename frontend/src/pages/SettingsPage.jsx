import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, Users, Shield, Save, CheckCircle, 
  AlertTriangle, UserMinus, ShieldAlert, Sparkles
} from 'lucide-react';

const SettingsPage = () => {
  const { user, setUser } = useAuth();
  
  // Organization States
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');
  const [reportingYear, setReportingYear] = useState('');
  
  // User Management State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // UX Feedback State
  const [feedback, setFeedback] = useState({ type: '', msg: '' });
  const [savingOrg, setSavingOrg] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/org/settings');
      setOrgName(data.name);
      setIndustry(data.industry);
      setRegion(data.region);
      setReportingYear(data.reportingYear);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/org/users');
      setUsersList(data);
    } catch (err) {
      console.error('Failed to fetch user list:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback({ type: '', msg: '' }), 4000);
  };

  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      await api.put('/org/settings', {
        name: orgName,
        industry,
        region,
        reportingYear
      });
      
      // Update global user context organization details if stored
      const savedUser = JSON.parse(localStorage.getItem('esg_user') || '{}');
      if (savedUser.organizationId) {
        savedUser.organizationId.name = orgName;
        savedUser.organizationId.reportingYear = reportingYear;
        localStorage.setItem('esg_user', JSON.stringify(savedUser));
        setUser(savedUser);
      }

      showFeedback('success', 'Organization configurations saved successfully!');
    } catch (err) {
      showFeedback('danger', 'Failed to save organization settings.');
    } finally {
      setSavingOrg(false);
    }
  };

  // Modify user role (Admin command)
  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await api.put(`/org/users/${targetUserId}/role`, { role: newRole });
      showFeedback('success', 'User access permissions updated successfully.');
      fetchUsers();
    } catch (err) {
      showFeedback('danger', err.response?.data?.error || 'Role change rejected.');
    }
  };

  // Modify account status (Admin suspend command)
  const handleStatusToggle = async (targetUserId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      await api.put(`/org/users/${targetUserId}/status`, { status: nextStatus });
      showFeedback('warning', `User account status shifted to ${nextStatus}.`);
      fetchUsers();
    } catch (err) {
      showFeedback('danger', err.response?.data?.error || 'Account status modification rejected.');
    }
  };

  const isAdmin = user?.role === 'Organization Admin';

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
      
      {/* Toast Alert Feedback */}
      {feedback.msg && (
        <div style={{
          ...styles.toast,
          backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)'
        }} className="fade-in">
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Workspace Settings</h1>
          <p style={styles.subtitle}>Configure multi-tenant boundary profiles and manage workspace permissions.</p>
        </div>
      </div>

      <div style={styles.splitLayout}>
        {/* Left Card - Organization Profile */}
        <div className="glass-card" style={{ flex: 1.2 }}>
          <div style={styles.cardHeader}>
            <Settings size={20} color="#10b981" />
            <h3 style={styles.cardTitle}>Tenant Profile Settings</h3>
          </div>
          <p style={styles.cardDesc}>Configure reporting industry classifications and compliance ESG calendar years.</p>
          
          <form onSubmit={handleOrgSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input
                type="text"
                className="form-input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isAdmin || savingOrg}
                required
              />
            </div>

            <div style={styles.rowLayout}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Industry Classification</label>
                <select 
                  className="form-input" 
                  value={industry} 
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={!isAdmin || savingOrg}
                >
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Technology">Technology</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Energy & Utilities">Energy & Utilities</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Regional Grid Scope</label>
                <select 
                  className="form-input" 
                  value={region} 
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={!isAdmin || savingOrg}
                >
                  <option value="North America">North America (NA Grid)</option>
                  <option value="Europe">Europe (EU Grid)</option>
                  <option value="Asia-Pacific">Asia-Pacific (APAC Grid)</option>
                  <option value="Global">Global / Generic</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ESG Reporting Year</label>
              <input
                type="number"
                className="form-input"
                value={reportingYear}
                onChange={(e) => setReportingYear(e.target.value)}
                disabled={!isAdmin || savingOrg}
                required
              />
            </div>

            {isAdmin ? (
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={savingOrg}>
                <Save size={16} />
                {savingOrg ? 'Saving configs...' : 'Save Organization Profile'}
              </button>
            ) : (
              <div style={styles.restrictedAlert}>
                <ShieldAlert size={16} />
                <span>Requires Organization Admin clearance to update environmental parameters.</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Card - Active Directory / User Management */}
        <div className="glass-card" style={{ flex: 1.8 }}>
          <div style={styles.cardHeader}>
            <Users size={20} color="#10b981" />
            <h3 style={styles.cardTitle}>Workspace Members Directory</h3>
          </div>
          <p style={styles.cardDesc}>View and audit user access clearance levels and active accounts status.</p>

          <div style={{ marginTop: '1.5rem' }}>
            {loadingUsers ? (
              <div style={styles.loadingWrapper}>
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="table-container" style={{ border: '1px solid #1e293b' }}>
                <table className="enterprise-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>USER NAME</th>
                      <th>ROLE CLEARANCE</th>
                      <th>STATUS</th>
                      {isAdmin && <th>CONTROLS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(member => {
                      const isSelf = member._id === user?.id;
                      
                      return (
                        <tr key={member._id} style={isSelf ? styles.selfRow : {}}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '600' }}>
                                {member.name} {isSelf && <span style={{ color: '#10b981', fontSize: '0.7rem' }}>(You)</span>}
                              </span>
                              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{member.email}</span>
                            </div>
                          </td>
                          <td>
                            {isAdmin && !isSelf ? (
                              <select
                                className="form-input"
                                style={styles.inlineSelect}
                                value={member.role}
                                onChange={(e) => handleRoleChange(member._id, e.target.value)}
                              >
                                <option value="Organization Admin">Org Admin</option>
                                <option value="ESG Analyst">ESG Analyst</option>
                                <option value="Viewer/Auditor">Auditor</option>
                              </select>
                            ) : (
                              <span style={{ fontWeight: '600' }}>{member.role}</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${member.status === 'Active' ? 'approved' : 'rejected'}`} style={{ fontSize: '0.65rem' }}>
                              {member.status}
                            </span>
                          </td>
                          {isAdmin && (
                            <td>
                              {!isSelf ? (
                                <button
                                  className={`btn ${member.status === 'Active' ? 'btn-danger' : 'btn-primary'}`}
                                  style={styles.controlBtn}
                                  onClick={() => handleStatusToggle(member._id, member.status)}
                                >
                                  {member.status === 'Active' ? 'Suspend' : 'Activate'}
                                </button>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.7rem', fontStyle: 'italic' }}>Protected</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const styles = {
  header: {
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: '0.25rem'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#94a3b8'
  },
  splitLayout: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  cardTitle: {
    fontSize: '1.25rem',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif'
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '1rem'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem'
  },
  rowLayout: {
    display: 'flex',
    gap: '1rem'
  },
  restrictedAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '0.8rem',
    marginTop: '1rem'
  },
  loadingWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '3rem'
  },
  selfRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.02)'
  },
  inlineSelect: {
    backgroundColor: '#060911',
    border: '1px solid #1e293b',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: '#cbd5e1',
    width: '120px'
  },
  controlBtn: {
    padding: '0.25rem 0.6rem',
    fontSize: '0.7rem',
    fontWeight: '700',
    borderRadius: '4px'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    borderRadius: '10px',
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    zIndex: '150',
    fontWeight: '600',
    fontSize: '0.9rem'
  }
};

export default SettingsPage;
