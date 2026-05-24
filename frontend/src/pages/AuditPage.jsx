import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Shield, Calendar, User, Info, ChevronDown, 
  ChevronUp, Plus, Minus, ArrowRight, Eye
} from 'lucide-react';

const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        action: actionFilter,
        page,
        limit: 20
      };
      const { data } = await api.get('/audit/logs', { params });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  const toggleExpandLog = (id) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const getActionBadgeStyle = (act) => {
    switch (act) {
      case 'upload':
        return { backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' };
      case 'approve':
        return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'reject':
        return { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'edit':
        return { backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' };
      case 'unlock':
        return { backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' };
      default:
        return { backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' };
    }
  };

  // Helper to render diffs
  const renderObjectDiff = (oldVal, newVal) => {
    if (!oldVal && !newVal) return <p style={{ color: '#64748b', fontStyle: 'italic' }}>No raw data alterations tracked.</p>;

    const allKeys = Array.from(new Set([
      ...Object.keys(oldVal || {}),
      ...Object.keys(newVal || {})
    ])).filter(k => k !== 'flags'); // skip logs clutter

    return (
      <div style={styles.diffBox}>
        <div style={styles.diffHeader}>
          <span>Ledger Element Schema Difference Map</span>
        </div>
        <div style={styles.diffList}>
          {allKeys.map(key => {
            const oldStr = oldVal?.[key] !== undefined ? JSON.stringify(oldVal[key]) : undefined;
            const newStr = newVal?.[key] !== undefined ? JSON.stringify(newVal[key]) : undefined;

            if (oldStr === newStr) return null; // no change

            return (
              <div key={key} style={styles.diffRow}>
                <span style={styles.diffKey}>{key}:</span>
                <div style={styles.diffVals}>
                  {oldStr !== undefined && (
                    <div style={styles.diffLineOld}>
                      <Minus size={12} color="#ef4444" />
                      <span>{oldStr}</span>
                    </div>
                  )}
                  {newStr !== undefined && (
                    <div style={styles.diffLineNew}>
                      <Plus size={12} color="#10b981" />
                      <span>{newStr}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
      
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Immutable Audit Ledger</h1>
          <p style={styles.subtitle}>Cryptographically compliant change tracking and verification timeline.</p>
        </div>

        {/* Action filter selector */}
        <div style={styles.filterBox}>
          <Shield size={14} color="#64748b" />
          <select 
            className="form-input" 
            style={styles.smallSelect} 
            value={actionFilter} 
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Actions</option>
            <option value="upload">Data Ingests</option>
            <option value="edit">Ledger Corrections</option>
            <option value="approve">Approvals & Locks</option>
            <option value="reject">Rejections</option>
            <option value="unlock">Manual overrides</option>
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading && logs.length === 0 ? (
          <div style={styles.loadingWrapper}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Verifying ledger blocks integrity...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={styles.emptyLedger}>
            <Shield size={48} color="#64748b" style={{ marginBottom: '1rem' }} />
            <h4>No audit entries found.</h4>
            <p>Once raw activity is ingested or review operations commence, actions are logged here permanently.</p>
          </div>
        ) : (
          <div style={styles.timelineContainer}>
            {logs.map((log, index) => {
              const isExpanded = expandedLogId === log._id;
              
              return (
                <div key={log._id} style={styles.logBlock}>
                  {/* Timeline track vertical line */}
                  {index < logs.length - 1 && <div style={styles.timelineLine}></div>}
                  
                  {/* Event Meta dot */}
                  <div style={{
                    ...styles.timelineDot,
                    borderColor: getActionBadgeStyle(log.action).color,
                    backgroundColor: getActionBadgeStyle(log.action).color === '#ef4444' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'
                  }}>
                    <Shield size={12} />
                  </div>

                  <div style={styles.logCard} className="glass-card" onClick={() => toggleExpandLog(log._id)}>
                    <div style={styles.logHeader}>
                      <div style={styles.actorRow}>
                        <div style={styles.avatar}>
                          <User size={14} color="#10b981" />
                        </div>
                        <div>
                          <span style={styles.actorName}>{log.userId?.name}</span>
                          <span style={styles.actorRole}>({log.userId?.role})</span>
                        </div>
                      </div>
                      
                      <div style={styles.metaRow}>
                        <span className="badge" style={getActionBadgeStyle(log.action)}>
                          {log.action}
                        </span>
                        <div style={styles.timeBox}>
                          <Calendar size={12} />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                      </div>
                    </div>

                    <p style={styles.logDetails}>{log.details}</p>

                    {log.recordId && (
                      <div style={styles.recordTag}>
                        <Info size={12} color="#64748b" />
                        <span>Scope Entity Target:</span>
                        <span style={styles.targetRef}>
                          {log.recordId.category} ({log.recordId.scope}) #{log.recordId._id.toString().substring(18)}
                        </span>
                      </div>
                    )}

                    {/* Expandable Diffs Area */}
                    {isExpanded && (
                      <div style={styles.expandArea} onClick={(e) => e.stopPropagation()}>
                        {renderObjectDiff(log.changes?.oldValue, log.changes?.newValue)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  filterBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#101726',
    border: '1px solid #1e293b',
    padding: '0.1rem 0.5rem',
    borderRadius: '8px'
  },
  smallSelect: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#94a3b8',
    cursor: 'pointer',
    width: 'auto',
    padding: '0.5rem'
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6rem 2rem'
  },
  emptyLedger: {
    padding: '5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#64748b'
  },
  timelineContainer: {
    padding: '2.5rem',
    backgroundColor: '#060911',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem'
  },
  logBlock: {
    display: 'flex',
    gap: '1.5rem',
    position: 'relative'
  },
  timelineLine: {
    position: 'absolute',
    left: '17px',
    top: '36px',
    bottom: '-32px',
    width: '2px',
    backgroundColor: '#1e293b',
    zIndex: '1'
  },
  timelineDot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '2',
    alignSelf: 'flex-start',
    marginTop: '4px'
  },
  logCard: {
    flex: 1,
    cursor: 'pointer',
    padding: '1.25rem',
    backgroundColor: '#11192a',
    transition: 'all 0.2s ease',
    border: '1px solid #1e293b'
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '0.75rem'
  },
  actorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actorName: {
    fontWeight: '600',
    color: '#f8fafc',
    fontSize: '0.85rem'
  },
  actorRole: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginLeft: '0.25rem'
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  timeBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    color: '#64748b'
  },
  logDetails: {
    fontSize: '0.9rem',
    color: '#cbd5e1',
    lineHeight: '1.5',
    marginBottom: '0.75rem'
  },
  recordTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    backgroundColor: '#0b0f19',
    borderRadius: '4px',
    padding: '0.35rem 0.5rem',
    fontSize: '0.75rem',
    color: '#64748b'
  },
  targetRef: {
    color: '#10b981',
    fontWeight: '600'
  },
  expandArea: {
    marginTop: '1.25rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #1e293b',
    animation: 'fadeIn 0.3s ease-out forwards'
  },
  diffBox: {
    backgroundColor: '#060911',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  diffHeader: {
    backgroundColor: '#0e1423',
    padding: '0.5rem 1rem',
    fontSize: '0.75rem',
    color: '#64748b',
    borderBottom: '1px solid #1e293b',
    fontWeight: '600'
  },
  diffList: {
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    fontFamily: 'monospace',
    fontSize: '0.75rem'
  },
  diffRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem'
  },
  diffKey: {
    color: '#38bdf8',
    fontWeight: '600',
    width: '120px',
    display: 'inline-block'
  },
  diffVals: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  diffLineOld: {
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem'
  },
  diffLineNew: {
    color: '#10b981',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem'
  }
};

export default AuditPage;
