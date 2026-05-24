import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Filter, CheckCircle, XCircle, AlertTriangle, 
  Lock, Unlock, ChevronRight, X, MessageSquare, Send, 
  Calendar, Info, Edit, Save, ShieldAlert, Sparkles
} from 'lucide-react';

const ReviewPage = () => {
  const { user } = useAuth();
  
  // Data State
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Filters State
  const [status, setStatus] = useState('Pending Review');
  const [sourceType, setSourceType] = useState('');
  const [scope, setScope] = useState('');
  const [flagged, setFlagged] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  
  // Detail Drawer State
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [drawerComments, setDrawerComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // Editing Mode States inside Drawer
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMeterId, setEditMeterId] = useState('');
  
  // General UI States
  const [feedback, setFeedback] = useState({ type: '', msg: '' });
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {
        status,
        sourceType,
        scope,
        flagged,
        search,
        sortBy,
        sortOrder,
        page,
        limit: 15
      };
      
      const { data } = await api.get('/review/records', { params });
      setRecords(data.records);
      setTotal(data.total);
    } catch (err) {
      showFeedback('danger', 'Failed to retrieve ESG ledger records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [status, sourceType, scope, flagged, sortBy, sortOrder, page]);

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback({ type: '', msg: '' }), 4000);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  // Checkbox Selectors
  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map(r => r._id));
    }
  };

  // Drawer details loading
  const openDrawer = async (rec) => {
    try {
      const { data } = await api.get(`/review/records/${rec._id}`);
      setDrawerRecord(data.record);
      setDrawerComments(data.comments);
      
      // Initialize Edit values
      setEditQty(data.record.originalValue);
      setEditDate(new Date(data.record.date).toISOString().split('T')[0]);
      setEditMeterId(data.record.originalData?.meterId || '');
      setIsEditing(false);
    } catch (err) {
      showFeedback('danger', 'Failed to open detailed drawer context.');
    }
  };

  const closeDrawer = () => {
    setDrawerRecord(null);
    setDrawerComments([]);
    setIsEditing(false);
  };

  // Submit Peer Review comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !drawerRecord) return;

    try {
      const { data } = await api.post(`/review/records/${drawerRecord._id}/comments`, { comment: newComment });
      setDrawerComments([...drawerComments, data]);
      setNewComment('');
    } catch (err) {
      showFeedback('danger', 'Comment submission rejected.');
    }
  };

  // Single Action Triggers
  const handleApproveSingle = async () => {
    if (!drawerRecord) return;
    try {
      await api.post('/review/approve', { ids: [drawerRecord._id], comment: 'Single analyst sign-off' });
      showFeedback('success', 'Record signed and locked successfully.');
      closeDrawer();
      fetchRecords();
    } catch (err) {
      showFeedback('danger', 'Approval failed.');
    }
  };

  const handleRejectSingle = async () => {
    if (!drawerRecord) return;
    try {
      await api.post('/review/reject', { ids: [drawerRecord._id], comment: 'Rejected by analyst review board' });
      showFeedback('warning', 'Record marked as Rejected.');
      closeDrawer();
      fetchRecords();
    } catch (err) {
      showFeedback('danger', 'Rejection failed.');
    }
  };

  // Administrator Unlock Action
  const handleUnlockSingle = async () => {
    if (!drawerRecord) return;
    try {
      const { data } = await api.post(`/review/records/${drawerRecord._id}/unlock`);
      showFeedback('info', 'Record compliance locks bypassed successfully.');
      openDrawer(data.record);
      fetchRecords();
    } catch (err) {
      showFeedback('danger', 'Unlock override failed.');
    }
  };

  // Save edits inside Drawer
  const handleSaveChanges = async () => {
    if (!drawerRecord) return;
    try {
      const { data } = await api.put(`/review/records/${drawerRecord._id}`, {
        originalValue: editQty,
        date: editDate,
        originalData: {
          meterId: editMeterId
        }
      });
      showFeedback('success', 'Values corrected, emissions recalculated.');
      openDrawer(data.record);
      fetchRecords();
    } catch (err) {
      showFeedback('danger', err.response?.data?.message || 'Failed to apply value correction.');
    }
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const { data } = await api.post('/review/approve', { ids: selectedIds });
      showFeedback('success', `Bulk approved and locked ${data.count} compliance record(s).`);
      setSelectedIds([]);
      fetchRecords();
    } catch (err) {
      showFeedback('danger', 'Bulk approval encountered errors.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const { data } = await api.post('/review/reject', { ids: selectedIds, comment: 'Bulk rejected by queue reviewer' });
      showFeedback('warning', `Flagged and rejected ${data.count} record(s).`);
      setSelectedIds([]);
      fetchRecords();
    } catch (err) {
      showFeedback('danger', 'Bulk rejection encountered errors.');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', animation: 'fadeIn 0.4s ease-out forwards' }}>
      
      {/* Toast Alert Feed */}
      {feedback.msg && (
        <div style={{
          ...styles.toast,
          backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : (feedback.type === 'warning' ? 'rgba(249, 115, 22, 0.95)' : 'rgba(239, 68, 68, 0.95)')
        }} className="fade-in">
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Auditor Review Board</h1>
          <p style={styles.subtitle}>Verify calculations correctness, review suspicious alerts, and authorize sign-offs.</p>
        </div>
        
        {/* Bulk Commands */}
        {selectedIds.length > 0 && (
          <div style={styles.bulkRow} className="fade-in">
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>
              Selected {selectedIds.length} item(s)
            </span>
            <button className="btn btn-primary" onClick={handleBulkApprove} disabled={bulkLoading}>
              <CheckCircle size={16} /> Approve & Lock
            </button>
            <button className="btn btn-danger" onClick={handleBulkReject} disabled={bulkLoading}>
              <XCircle size={16} /> Reject
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filtering panel */}
      <div className="glass-card" style={styles.filterCard}>
        <form onSubmit={handleSearchSubmit} style={styles.filterForm}>
          <div style={styles.searchBox}>
            <Search size={16} color="#64748b" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by Meter, Employee, Vendor, Plant..."
              style={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        <div style={styles.selectorsRow}>
          <div style={styles.selectGroup}>
            <Filter size={14} color="#64748b" />
            <select className="form-input" style={styles.smallSelect} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved / Locked</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div style={styles.selectGroup}>
            <select className="form-input" style={styles.smallSelect} value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              <option value="">All Sources</option>
              <option value="SAP">SAP Fuel</option>
              <option value="Utility">Utility Bills</option>
              <option value="Travel">Business Travel</option>
            </select>
          </div>

          <div style={styles.selectGroup}>
            <select className="form-input" style={styles.smallSelect} value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="">All Scopes</option>
              <option value="Scope 1">Scope 1 - Direct</option>
              <option value="Scope 2">Scope 2 - Purchased</option>
              <option value="Scope 3">Scope 3 - Value Chain</option>
            </select>
          </div>

          <div style={styles.selectGroup}>
            <select className="form-input" style={styles.smallSelect} value={flagged} onChange={(e) => setFlagged(e.target.value)}>
              <option value="">All Records</option>
              <option value="true">Anomalous / Flagged Only</option>
              <option value="false">Clean Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Review Data Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={styles.loadingTable}>
            <div className="spinner"></div>
            <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Querying audit queue...</p>
          </div>
        ) : records.length === 0 ? (
          <div style={styles.emptyTable}>
            <ShieldAlert size={48} color="#64748b" style={{ marginBottom: '1rem' }} />
            <h4>No records found in this queue state.</h4>
            <p>Try clearing your active filters or ingest a new spreadsheet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === records.length && records.length > 0} />
                  </th>
                  <th>TRANSACTION</th>
                  <th>SOURCE</th>
                  <th>SCOPE</th>
                  <th>REPORTING DATE</th>
                  <th>ORIGINAL VALUE</th>
                  <th>CARBON FOOTPRINT</th>
                  <th>ANOMALIES</th>
                  <th>STATUS</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr 
                    key={rec._id} 
                    style={{ cursor: 'pointer', ...(selectedIds.includes(rec._id) ? styles.selectedRow : {}) }}
                    onClick={() => openDrawer(rec)}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(rec._id)} 
                        onChange={() => handleSelectRow(rec._id)} 
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: '#f8fafc' }}>{rec.category}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Ref ID: #{rec._id.toString().substring(18)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-scope-${rec.sourceType === 'SAP' ? '1' : (rec.sourceType === 'Utility' ? '2' : '3')}`}>
                        {rec.sourceType === 'SAP' ? 'SAP FUEL' : (rec.sourceType === 'Utility' ? 'ELECTRIC' : 'TRAVEL')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{rec.scope}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8' }}>
                        <Calendar size={14} />
                        <span>{new Date(rec.date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace' }}>
                        {rec.originalValue} {rec.originalUnit}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: '#10b981', fontFamily: 'monospace' }}>
                        {rec.co2e.toLocaleString()} kg CO₂e
                      </span>
                    </td>
                    <td>
                      {rec.flags.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: rec.flags.some(f => f.severity === 'CRITICAL') ? '#ef4444' : '#f97316' }}>
                          <AlertTriangle size={14} />
                          <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{rec.flags.length} alerts</span>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Clean</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${rec.status === 'Approved' ? 'approved' : (rec.status === 'Rejected' ? 'rejected' : 'pending')}`}>
                        {rec.status}
                      </span>
                    </td>
                    <td>
                      <ChevronRight size={18} color="#64748b" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sliding Side Drawer Panel */}
      {drawerRecord && (
        <div className="drawer-backdrop" onClick={closeDrawer}>
          <div className="detail-drawer" onClick={(e) => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div className="drawer-header">
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#10b981', letterSpacing: '0.05em' }}>
                  {drawerRecord.scope.toUpperCase()} • COMPLIANCE DETAILS
                </span>
                <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', marginTop: '0.15rem', fontFamily: 'Outfit, sans-serif' }}>
                  {drawerRecord.category}
                </h3>
              </div>
              <button style={styles.closeBtn} onClick={closeDrawer}><X size={20} /></button>
            </div>

            {/* Drawer Body content */}
            <div className="drawer-body">
              
              {/* Lock Indicator Card */}
              {drawerRecord.isLocked ? (
                <div style={styles.lockCard}>
                  <Lock size={18} color="#10b981" />
                  <div style={{ flex: 1 }}>
                    <h5 style={{ color: '#10b981', fontWeight: '600' }}>Approved & Locked</h5>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                      This ESG ledger entry is compliance-locked. Editing is restricted to prevent tampering.
                    </p>
                  </div>
                  {user?.role === 'Organization Admin' && (
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={handleUnlockSingle}>
                      <Unlock size={12} /> Unlock
                    </button>
                  )}
                </div>
              ) : (
                <div style={styles.unlockCard}>
                  <Info size={18} color="#3b82f6" />
                  <div style={{ flex: 1 }}>
                    <h5 style={{ color: '#3b82f6', fontWeight: '600' }}>Active Review Queue</h5>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                      This entry is editable and awaiting analyst validation. Select Approve to sign off.
                    </p>
                  </div>
                </div>
              )}

              {/* Grid: Ingestion and Scope Details */}
              <div style={styles.drawerSection}>
                <h4 style={styles.drawerSecTitle}>Operational Footprint Summary</h4>
                
                <div style={styles.statsCardGrid}>
                  <div style={styles.miniStatCard}>
                    <span style={styles.miniLabel}>Standard Quantity</span>
                    <span style={styles.miniVal}>{drawerRecord.normalizedValue} {drawerRecord.normalizedUnit}</span>
                  </div>
                  <div style={styles.miniStatCard}>
                    <span style={styles.miniLabel}>Total CO₂e Weight</span>
                    <span style={{ ...styles.miniVal, color: '#10b981' }}>{drawerRecord.co2e.toLocaleString()} kg</span>
                  </div>
                </div>

                <div style={styles.detailList}>
                  <div style={styles.detailItem}>
                    <span>Calculations Formula:</span>
                    <span style={styles.formulaText}>{drawerRecord.conversionFormula || 'Standard conversion * 1.0'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span>Verification State:</span>
                    <span className={`badge badge-${drawerRecord.status === 'Approved' ? 'approved' : (drawerRecord.status === 'Rejected' ? 'rejected' : 'pending')}`}>
                      {drawerRecord.status}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span>Ingestion Job ID:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{drawerRecord.jobId.toString().substring(18)}</span>
                  </div>
                </div>
              </div>

              {/* Flags and Anomalies Alerts Box */}
              {drawerRecord.flags.length > 0 && (
                <div style={styles.drawerSection}>
                  <h4 style={{ ...styles.drawerSecTitle, color: '#ef4444' }}>AI Ingestion Alerts</h4>
                  <div style={styles.flagsList}>
                    {drawerRecord.flags.map((flg, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          ...styles.flagItem,
                          borderColor: flg.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(249, 115, 22, 0.3)',
                          backgroundColor: flg.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(249, 115, 22, 0.05)'
                        }}
                      >
                        <AlertTriangle size={16} color={flg.severity === 'CRITICAL' ? '#ef4444' : '#f97316'} />
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: flg.severity === 'CRITICAL' ? '#ef4444' : '#f97316', display: 'block' }}>
                            {flg.type} WARNING ({flg.severity} Priority)
                          </span>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>{flg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Edit Form Panel */}
              <div style={styles.drawerSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={styles.drawerSecTitle}>Ledger Quantities Correction</h4>
                  {!drawerRecord.isLocked && (
                    <button 
                      style={styles.editToggleBtn} 
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit size={12} /> {isEditing ? 'Cancel Edit' : 'Edit Fields'}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div style={styles.editForm} className="fade-in">
                    <div className="form-group">
                      <label className="form-label">Original Quantity ({drawerRecord.originalUnit})</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Transaction/Posting Date</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                    </div>
                    {drawerRecord.sourceType === 'Utility' && (
                      <div className="form-group">
                        <label className="form-label">Meter Identifier (Meter ID)</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={editMeterId}
                          onChange={(e) => setEditMeterId(e.target.value)}
                        />
                      </div>
                    )}
                    <button className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }} onClick={handleSaveChanges}>
                      <Save size={14} /> Recalculate & Save Changes
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {drawerRecord.isLocked ? 'This record is locked. You cannot correct quantities.' : 'Correct values directly by clicking Edit Fields above.'}
                  </p>
                )}
              </div>

              {/* Collaborator Peer Review comments feed */}
              <div style={styles.drawerSection}>
                <h4 style={styles.drawerSecTitle}>Peer Review Discussion</h4>
                
                <div style={styles.commentsBox}>
                  {drawerComments.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No comments submitted yet. Initiate peer collaboration!</p>
                  ) : (
                    drawerComments.map(c => (
                      <div key={c._id} style={styles.commentItem}>
                        <div style={styles.commentMeta}>
                          <span style={styles.commentAuthor}>{c.userId?.name}</span>
                          <span style={styles.commentRole}>({c.userId?.role})</span>
                          <span style={styles.commentTime}>{new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p style={styles.commentText}>{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} style={styles.commentForm}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Submit feedback or reason for override..."
                    style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button type="submit" style={styles.sendCommentBtn} disabled={!newComment.trim()}>
                    <Send size={14} />
                  </button>
                </form>
              </div>

            </div>

            {/* Drawer Actions Footer */}
            {!drawerRecord.isLocked && (
              <div className="drawer-footer">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApproveSingle}>
                  <CheckCircle size={16} /> Approve & Lock
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleRejectSingle}>
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}

          </div>
        </div>
      )}

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
  bulkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#060911',
    border: '1px solid #1e293b',
    borderRadius: '10px'
  },
  filterCard: {
    marginBottom: '2rem',
    padding: '1.25rem'
  },
  filterForm: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  searchBox: {
    position: 'relative',
    flex: 1
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)'
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#060911',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '0.7rem 1rem 0.7rem 2.25rem',
    color: '#f8fafc',
    fontSize: '0.9rem'
  },
  selectorsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  selectGroup: {
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
    padding: '0.35rem 0.5rem'
  },
  loadingTable: {
    padding: '4rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyTable: {
    padding: '4rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#64748b'
  },
  selectedRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'color 0.2s ease'
  },
  lockCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  unlockCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  drawerSection: {
    marginBottom: '1.75rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #1e293b'
  },
  drawerSecTitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '700',
    fontFamily: 'Outfit, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: '0.75rem'
  },
  statsCardGrid: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#101726',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  miniLabel: {
    fontSize: '0.65rem',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  miniVal: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#f8fafc',
    fontFamily: 'monospace'
  },
  detailList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  formulaText: {
    backgroundColor: '#060911',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: '#34d399',
    fontFamily: 'monospace',
    fontSize: '0.75rem'
  },
  flagsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  flagItem: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem'
  },
  editToggleBtn: {
    background: 'none',
    border: 'none',
    color: '#10b981',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  editForm: {
    backgroundColor: '#060911',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '0.5rem'
  },
  commentsBox: {
    backgroundColor: '#060911',
    borderRadius: '8px',
    padding: '0.75rem',
    maxHeight: '160px',
    overflowY: 'auto',
    border: '1px solid #1e293b',
    marginBottom: '0.75rem'
  },
  commentItem: {
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #101726'
  },
  commentMeta: {
    display: 'flex',
    gap: '0.25rem',
    fontSize: '0.7rem',
    color: '#64748b',
    marginBottom: '0.2rem'
  },
  commentAuthor: {
    color: '#10b981',
    fontWeight: '600'
  },
  commentRole: {
    fontStyle: 'italic'
  },
  commentTime: {
    marginLeft: 'auto'
  },
  commentText: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
    lineHeight: '1.4'
  },
  commentForm: {
    display: 'flex',
    gap: '0.5rem'
  },
  sendCommentBtn: {
    backgroundColor: '#10b981',
    border: 'none',
    color: '#042f1a',
    padding: '0 0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
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

export default ReviewPage;
