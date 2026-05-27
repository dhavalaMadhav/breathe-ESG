import React, { useState, useEffect } from 'react';
import api from './services/api';
import { 
  Database, Upload, AlertTriangle, CheckCircle, 
  Lock, FileText, Search, Filter, RefreshCw, X
} from 'lucide-react';

const App = () => {
  // Core State
  const [records, setRecords] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({
    total_co2e: 0.0,
    pending_count: 0,
    flagged_count: 0,
    locked_count: 0,
    total_records: 0,
    scopes: { 'Scope 1': 0, 'Scope 2': 0, 'Scope 3': 0 }
  });

  // UI Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [suspiciousFilter, setSuspiciousFilter] = useState('');
  const [search, setSearch] = useState('');

  // Loaders & Details Modal
  const [loading, setLoading] = useState(true);
  const [uploadingSource, setUploadingSource] = useState(null); // 'SAP' | 'Utility' | 'Travel' | null
  const [rawRecordModal, setRawRecordModal] = useState(null);
  const [toast, setToast] = useState(null);

  // Upload metrics tracker per panel
  const [panelStats, setPanelStats] = useState({
    SAP: { total: 0, processed: 0, failed: 0, flagged: 0, status: 'Ready' },
    Utility: { total: 0, processed: 0, failed: 0, flagged: 0, status: 'Ready' },
    Travel: { total: 0, processed: 0, failed: 0, flagged: 0, status: 'Ready' }
  });

  const fetchData = async () => {
    try {
      // 1. Fetch Stats
      const statsRes = await api.get('/dashboard/stats/');
      setStats(statsRes.data);

      // 2. Fetch Records
      const params = {
        status: statusFilter,
        source_type: sourceFilter,
        suspicious: suspiciousFilter,
        search: search
      };
      const recsRes = await api.get('/records/', { params });
      setRecords(recsRes.data);

      // 3. Fetch Batches
      const batchesRes = await api.get('/batches/');
      setBatches(batchesRes.data);
    } catch (err) {
      showToast('danger', 'Failed to retrieve ESG ledger details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, sourceFilter, suspiciousFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Upload CSV API trigger
  const performUpload = async (sourceType, csvText, fileName) => {
    setUploadingSource(sourceType);
    setPanelStats(prev => ({
      ...prev,
      [sourceType]: { ...prev[sourceType], status: 'Ingesting...' }
    }));

    const blob = new Blob([csvText], { type: 'text/csv' });
    const file = new File([blob], fileName, { type: 'text/csv' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_type', sourceType);

    try {
      const response = await api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { batch } = response.data;
      
      // Update specific panel stats
      setPanelStats(prev => ({
        ...prev,
        [sourceType]: {
          total: batch.total_rows,
          processed: batch.processed_rows,
          failed: batch.failed_rows,
          flagged: batch.flagged_rows,
          status: 'Completed'
        }
      }));

      showToast('success', `Ingestion Complete! Ingested ${batch.processed_rows} rows from ${fileName}.`);
      fetchData();
    } catch (err) {
      showToast('danger', `Pipeline failed: ${err.response?.data?.error || 'Unresolved mapping error.'}`);
      setPanelStats(prev => ({
        ...prev,
        [sourceType]: { ...prev[sourceType], status: 'Failed' }
      }));
    } finally {
      setUploadingSource(null);
    }
  };

  // Drag & drop file handlers
  const handleDrop = (e, sourceType) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        showToast('danger', 'Gateway accepts CSV spreadsheets only.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        performUpload(sourceType, evt.target.result, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e, sourceType) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        performUpload(sourceType, evt.target.result, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Approve & Lock Action
  const handleApprove = async (id) => {
    try {
      await api.post(`/records/${id}/approve/`);
      showToast('success', 'Normalized record validated and locked for audit.');
      fetchData();
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Approval rejected.');
    }
  };

  // Reject Action
  const handleReject = async (id) => {
    try {
      await api.post(`/records/${id}/reject/`);
      showToast('warning', 'Record flagged as Discarded.');
      fetchData();
    } catch (err) {
      showToast('danger', 'Rejection rejected.');
    }
  };

  return (
    <div className="responsive-app-shell" style={styles.appShell}>
      
      {/* Toast Popup alert */}
      {toast && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'success' ? '#10b981' : (toast.type === 'warning' ? '#f97316' : '#ef4444')
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="responsive-header" style={styles.header}>
        <div style={styles.branding}>
          <img src="/logo.png" alt="Breathe ESG Logo" style={{ height: '36px', width: 'auto', display: 'block', marginRight: '0.25rem' }} />
          <h1 style={styles.brandTitle}>Breathe ESG <span className="mobile-hidden" style={styles.brandBadge}>Analyst Prototype</span></h1>
        </div>
        <div className="mobile-hidden" style={styles.headerMeta}>
          <span style={styles.metaYear}>Reporting Grid: SQLite (SQLite3)</span>
          <span style={styles.metaYear}>Target Year: 2026</span>
        </div>
      </header>

      {/* 1. Executive Summary Cards Panel */}
      <div className="responsive-summary-deck" style={styles.summaryDeck}>
        <div className="glass-card" style={{ ...styles.statCard, paddingBottom: '1rem' }}>
          <span style={styles.statLabel}>APPROVED FOOTPRINT</span>
          <h2 style={{ ...styles.statVal, color: '#10b981', marginBottom: '0.25rem' }}>
            {(stats.total_co2e / 1000).toFixed(2)} <span style={styles.statUnit}>tons CO₂e</span>
          </h2>
          
          {/* Dynamic Stacked Scope Chart Bar */}
          <div style={{
            display: 'flex',
            height: '6px',
            borderRadius: '3px',
            overflow: 'hidden',
            backgroundColor: '#242426',
            margin: '0.6rem 0'
          }}>
            <div style={{ width: `${(stats.scopes['Scope 1'] || 0) / (((stats.scopes['Scope 1'] || 0) + (stats.scopes['Scope 2'] || 0) + (stats.scopes['Scope 3'] || 0)) || 1) * 100}%`, backgroundColor: '#ef4444', transition: 'width 0.3s ease' }}></div>
            <div style={{ width: `${(stats.scopes['Scope 2'] || 0) / (((stats.scopes['Scope 1'] || 0) + (stats.scopes['Scope 2'] || 0) + (stats.scopes['Scope 3'] || 0)) || 1) * 100}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }}></div>
            <div style={{ width: `${(stats.scopes['Scope 3'] || 0) / (((stats.scopes['Scope 1'] || 0) + (stats.scopes['Scope 2'] || 0) + (stats.scopes['Scope 3'] || 0)) || 1) * 100}%`, backgroundColor: '#a855f7', transition: 'width 0.3s ease' }}></div>
          </div>

          <div style={styles.scopeSplitRow}>
            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
              S1: {(stats.scopes['Scope 1'] / 1000).toFixed(1)}t
            </span>
            <span style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
              S2: {(stats.scopes['Scope 2'] / 1000).toFixed(1)}t
            </span>
            <span style={{ color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#a855f7' }}></span>
              S3: {(stats.scopes['Scope 3'] / 1000).toFixed(1)}t
            </span>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <span style={styles.statLabel}>PENDING AUDIT QUEUE</span>
          <h2 style={styles.statVal}>{stats.pending_count} <span style={styles.statUnit}>records</span></h2>
          
          {/* Dynamic Pending Progress bar */}
          <div style={{
            height: '6px',
            borderRadius: '3px',
            overflow: 'hidden',
            backgroundColor: '#242426',
            margin: '0.5rem 0 0.75rem 0'
          }}>
            <div style={{ width: `${stats.total_records > 0 ? (stats.pending_count / stats.total_records) * 100 : 0}%`, backgroundColor: '#10b981', transition: 'width 0.3s ease' }}></div>
          </div>
          
          <p style={styles.statFooter}>Awaiting analyst sign-off</p>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <span style={styles.statLabel}>FLAGGED ANOMALIES</span>
          <h2 style={{ ...styles.statVal, color: stats.flagged_count > 0 ? '#f97316' : '#10b981' }}>
            {stats.flagged_count} <span style={styles.statUnit}>warnings</span>
          </h2>

          {/* Dynamic Flagged Progress bar */}
          <div style={{
            height: '6px',
            borderRadius: '3px',
            overflow: 'hidden',
            backgroundColor: '#242426',
            margin: '0.5rem 0 0.75rem 0'
          }}>
            <div style={{ width: `${stats.total_records > 0 ? (stats.flagged_count / stats.total_records) * 100 : 0}%`, backgroundColor: '#f97316', transition: 'width 0.3s ease' }}></div>
          </div>

          <p style={styles.statFooter}>Statistical outliers & ground limits</p>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <span style={styles.statLabel}>AUDIT LOCK RATIO</span>
          <h2 style={styles.statVal}>
            {stats.total_records > 0 ? Math.round((stats.locked_count / stats.total_records) * 100) : 0}%
          </h2>

          {/* Dynamic Lock Progress bar */}
          <div style={{
            height: '6px',
            borderRadius: '3px',
            overflow: 'hidden',
            backgroundColor: '#242426',
            margin: '0.5rem 0 0.75rem 0'
          }}>
            <div style={{ width: `${stats.total_records > 0 ? (stats.locked_count / stats.total_records) * 100 : 0}%`, backgroundColor: '#10b981', transition: 'width 0.3s ease' }}></div>
          </div>

          <p style={styles.statFooter}>{stats.locked_count} of {stats.total_records} records secured</p>
        </div>
      </div>

      {/* 2. Gateway Ingest Upload Center */}
      <div className="responsive-upload-row" style={styles.uploadRow}>
        {['SAP', 'Utility', 'Travel'].map(source => {
          const sStat = panelStats[source];
          const isCurrentUploading = uploadingSource === source;

          return (
            <div key={source} className="glass-card" style={styles.uploadCard}>
              <div style={styles.cardHeader}>
                <Database size={18} color="#10b981" />
                <h3 style={styles.cardTitle}>
                  {source === 'SAP' ? 'SAP Fuel ERP' : (source === 'Utility' ? 'Utility Electricity' : 'Corporate Travel')}
                </h3>
              </div>
              <p style={styles.cardDesc}>
                {source === 'SAP' ? 'Ingest fuel Menge standardizations (Scope 1).' : (source === 'Utility' ? 'Standardize building electrical logs (Scope 2).' : 'Estimate flight aviation footprints (Scope 3).')}
              </p>

              {/* Drag drop zone */}
              <div 
                style={styles.dropzone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, source)}
              >
                <Upload size={24} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                <span style={styles.dropText}>Drag spreadsheet here or</span>
                <label style={styles.fileLabel}>
                  Browse CSV
                  <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, source)} disabled={isCurrentUploading} />
                </label>
              </div>

              {/* Ingestion stats */}
              <div style={styles.uploadControls}>

                <div style={styles.panelStatsRow}>
                  <span style={styles.panelStatusText}>
                    Status: <strong style={{ color: sStat.status === 'Completed' ? '#10b981' : '#cbd5e1' }}>{sStat.status}</strong>
                  </span>
                  {sStat.total > 0 && (
                    <span style={styles.panelMetricsText}>
                      Ingested {sStat.processed}/{sStat.total} ({sStat.flagged} flagged)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Review Table Filters Header */}
      <div className="glass-card" style={styles.reviewCard}>
        <div style={styles.tableHeaderRow}>
          <div>
            <h3 style={styles.sectionTitle}>Environmental Activity review queue</h3>
            <p style={styles.sectionDesc}>Verify conversion arithmetic, evaluate alerts, and lock compliant rows.</p>
          </div>
          
          <button className="btn btn-secondary" onClick={fetchData} style={{ padding: '0.5rem' }}>
            <RefreshCw size={14} /> Re-sync
          </button>
        </div>

        {/* Filters and search panel */}
        <div className="responsive-filters" style={styles.filtersPanel}>
          <form className="responsive-search-form" onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <div style={styles.searchContainer}>
              <Search size={14} color="#64748b" style={styles.searchIcon} />
              <input
                type="text"
                className="form-input"
                style={styles.searchInput}
                placeholder="Search activity type (e.g. Diesel, Electricity)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: '0 1rem' }}>Search</button>
          </form>

          <div className="responsive-selectors" style={styles.selectorsRow}>
            <div className="responsive-select-wrapper" style={styles.selectWrapper}>
              <Filter size={12} color="#64748b" />
              <select className="form-input" style={styles.smallSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending Review</option>
                <option value="Approved">Approved & Locked</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="responsive-select-wrapper" style={styles.selectWrapper}>
              <select className="form-input" style={styles.smallSelect} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option value="">All Sources</option>
                <option value="SAP">SAP Fuel</option>
                <option value="Utility">Utility Bills</option>
                <option value="Travel">Business Travel</option>
              </select>
            </div>

            <div className="responsive-select-wrapper" style={styles.selectWrapper}>
              <select className="form-input" style={styles.smallSelect} value={suspiciousFilter} onChange={(e) => setSuspiciousFilter(e.target.value)}>
                <option value="">All Records</option>
                <option value="true">Flagged Suspicious Only</option>
                <option value="false">Clean Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sticky Review Table */}
        <div className="table-container" style={{ maxHeight: '380px' }}>
          {loading ? (
            <div style={styles.loadingSpinner}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Loading carbon footprint ledger...</p>
            </div>
          ) : records.length === 0 ? (
            <div style={styles.emptyTable}>
              <AlertTriangle size={36} color="#64748b" />
              <p style={{ marginTop: '0.5rem', fontWeight: '600' }}>No records match the current filters.</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Try clearing filters or upload CSV spreadsheets to populate rows!</p>
            </div>
          ) : (
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>SOURCE</th>
                  <th>ACTIVITY DETAILS</th>
                  <th>SCOPE</th>
                  <th>QUANTITY</th>
                  <th>UNIT</th>
                  <th>EST CO₂e WEIGHT</th>
                  <th>STATUS</th>
                  <th>ANOMALIES</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id} style={rec.locked ? styles.lockedRow : {}}>
                    <td>
                      <span className={`badge badge-scope-${rec.source_type === 'SAP' ? '1' : (rec.source_type === 'Utility' ? '2' : '3')}`} style={{ fontSize: '0.7rem' }}>
                        {rec.source_type === 'SAP' ? 'SAP FUEL' : (rec.source_type === 'Utility' ? 'ELECTRIC' : 'TRAVEL')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: '#f8fafc' }}>{rec.activity_type}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Ref: #{rec.id}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', fontSize: '0.85rem' }}>{rec.scope}</td>
                    <td style={{ fontFamily: 'monospace' }}>{rec.normalized_quantity.toLocaleString()}</td>
                    <td>{rec.normalized_unit}</td>
                    <td>
                      <span style={{ fontWeight: '700', color: '#10b981', fontFamily: 'monospace' }}>
                        {rec.co2e_estimate.toLocaleString()} kg
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${rec.status === 'Approved' ? 'approved' : (rec.status === 'Rejected' ? 'rejected' : 'pending')}`} style={{ fontSize: '0.7rem' }}>
                        {rec.status}
                      </span>
                    </td>
                    <td>
                      {rec.suspicious ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f97316' }}>
                          <AlertTriangle size={12} />
                          <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Flagged</span>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Clean</span>
                      )}
                    </td>
                    <td>
                      <div style={styles.actionCell}>
                        {rec.locked ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>
                            <Lock size={12} /> Locked Audit
                          </div>
                        ) : (
                          <>
                            <button className="btn btn-primary" style={styles.actionBtn} onClick={() => handleApprove(rec.id)}>
                              Approve
                            </button>
                            <button className="btn btn-danger" style={{ ...styles.actionBtn, padding: '0.25rem 0.5rem' }} onClick={() => handleReject(rec.id)}>
                              Reject
                            </button>
                          </>
                        )}
                        <button className="btn btn-secondary" style={{ ...styles.actionBtn, padding: '0.25rem 0.5rem' }} onClick={() => setRawRecordModal(rec)}>
                          View Raw
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. Bottom Split Layout (Flagged Deck vs Approved locked) */}
      <div className="responsive-bottom-split" style={styles.bottomSplit}>
        {/* Suspicious logs warnings panel */}
        <div className="glass-card" style={{ flex: 1 }}>
          <div style={styles.cardHeader}>
            <AlertTriangle size={18} color="#f97316" />
            <h3 style={styles.cardTitle}>Flagged anomalies warnings logs</h3>
          </div>
          <p style={styles.cardDesc}>Rows flagged by suspicious detector rules requiring manual check.</p>
          
          <div style={styles.suspiciousDeck}>
            {records.filter(r => r.suspicious).length === 0 ? (
              <p style={styles.emptySplitText}>No flagged records in current list.</p>
            ) : (
              records.filter(r => r.suspicious).map(rec => (
                <div key={rec.id} style={styles.suspiciousBlock}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{rec.activity_type} (Ref #{rec.id})</span>
                    <span className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', fontSize: '0.65rem' }}>
                      {rec.source_type} Warning
                    </span>
                  </div>
                  <p style={styles.suspiciousText}>{rec.suspicious_reason}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audited Approved and Locked ledger */}
        <div className="glass-card" style={{ flex: 1 }}>
          <div style={styles.cardHeader}>
            <Lock size={18} color="#10b981" />
            <h3 style={styles.cardTitle}>Approved compliance lock ledger</h3>
          </div>
          <p style={styles.cardDesc}>Read-only locked entries approved by analysts, secured for audit files.</p>

          <div style={styles.lockedDeck}>
            {records.filter(r => r.locked).length === 0 ? (
              <p style={styles.emptySplitText}>No locked/approved records in current list.</p>
            ) : (
              records.filter(r => r.locked).map(rec => (
                <div key={rec.id} style={styles.lockedBlock}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{rec.activity_type}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#10b981', fontWeight: '700' }}>
                      {rec.co2e_estimate.toLocaleString()} kg CO₂e
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.7rem', color: '#64748b' }}>
                    <span>Approved by Analyst Console</span>
                    <span>Ref #{rec.id} LOCKED</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. View Raw Data Modal Overlay */}
      {rawRecordModal && (
        <div style={styles.modalBackdrop} onClick={() => setRawRecordModal(null)}>
          <div className="responsive-modal-card" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="#10b981" />
                <h4 style={{ color: '#f8fafc', fontSize: '1rem', fontFamily: 'Outfit, sans-serif' }}>
                  Raw Spreadsheet Row Lineage Explorer
                </h4>
              </div>
              <button style={styles.modalClose} onClick={() => setRawRecordModal(null)}><X size={18} /></button>
            </div>
            
            <div style={styles.modalBody}>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                Original parsed JSON data mapped from uploaded CSV spreadsheet before ESG transformations:
              </p>
              <pre style={styles.jsonBlock}>
                {JSON.stringify(rawRecordModal.raw_data, null, 2)}
              </pre>
              
              <h5 style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '1.25rem', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                ESG Normalization output:
              </h5>
              <div style={styles.normComparisonGrid}>
                <div style={styles.normCompCell}>
                  <span style={styles.normCompLabel}>Scope Classification</span>
                  <span style={styles.normCompVal}>{rawRecordModal.scope}</span>
                </div>
                <div style={styles.normCompCell}>
                  <span style={styles.normCompLabel}>Standardized Quantity</span>
                  <span style={styles.normCompVal}>{rawRecordModal.normalized_quantity} {rawRecordModal.normalized_unit}</span>
                </div>
                <div style={styles.normCompCell}>
                  <span style={styles.normCompLabel}>CO2e Emissions</span>
                  <span style={styles.normCompVal}>{rawRecordModal.co2e_estimate} kg CO₂e</span>
                </div>
              </div>

              {rawRecordModal.normalization_metadata && (
                <>
                  <h5 style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '1.25rem', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                    Audit Standardization Lineage Trace:
                  </h5>
                  <div style={{
                    backgroundColor: '#060911',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Raw Source Input:</span>
                      <strong style={{ color: '#f8fafc' }}>
                        {rawRecordModal.normalization_metadata.raw_value} {rawRecordModal.normalization_metadata.raw_unit}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Conversion Multiplier:</span>
                      <strong style={{ color: '#f8fafc' }}>
                        {rawRecordModal.normalization_metadata.conversion_factor}x
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Standardized Quantity:</span>
                      <strong style={{ color: '#10b981' }}>
                        {rawRecordModal.normalized_quantity} {rawRecordModal.normalized_unit}
                      </strong>
                    </div>
                    <div style={{ borderTop: '1px dashed #1e293b', margin: '0.25rem 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>Emissions Calculation:</span>
                      <span style={{ color: '#34d399', fontFamily: 'monospace' }}>
                        {rawRecordModal.normalization_metadata.calculation_formula}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  appShell: {
    padding: '2.5rem',
    maxWidth: '1600px',
    width: '100%',
    margin: '0 auto',
    animation: 'fadeIn 0.4s ease-out forwards',
    backgroundColor: '#080808',
    minHeight: '100vh',
    color: '#f8fafc'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2.5rem',
    borderBottom: '1px solid #242426',
    paddingBottom: '1rem'
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  brandTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: '-0.03em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  brandBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '4px',
    padding: '0.15rem 0.4rem',
    fontSize: '0.65rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  headerMeta: {
    display: 'flex',
    gap: '1rem'
  },
  metaYear: {
    fontSize: '0.75rem',
    backgroundColor: '#161616',
    border: '1px solid #242426',
    borderRadius: '6px',
    padding: '0.35rem 0.75rem',
    color: '#94a3b8',
    fontWeight: '600'
  },
  summaryDeck: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  statCard: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '130px',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    border: '1px solid #242426'
  },
  statLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.05em'
  },
  statVal: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif',
    margin: '0.5rem 0'
  },
  statUnit: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '600'
  },
  scopeSplitRow: {
    display: 'flex',
    gap: '0.75rem',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  statFooter: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  uploadRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  uploadCard: {
    padding: '1.5rem',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    border: '1px solid #242426',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '280px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.35rem'
  },
  cardTitle: {
    fontSize: '1.1rem',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: '600'
  },
  cardDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginBottom: '1rem',
    lineHeight: '1.4'
  },
  dropzone: {
    border: '1.5px dashed #242426',
    borderRadius: '8px',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 22, 22, 0.4)',
    textAlign: 'center',
    cursor: 'pointer'
  },
  dropText: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '0.4rem'
  },
  fileLabel: {
    backgroundColor: '#10b981',
    color: '#042f1a',
    padding: '0.3rem 0.75rem',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '0.75rem',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif'
  },
  uploadControls: {
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  panelStatsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: '#64748b',
    marginTop: '0.25rem'
  },
  panelStatusText: {},
  panelMetricsText: {},
  reviewCard: {
    marginBottom: '2.5rem',
    padding: '1.5rem',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    border: '1px solid #242426'
  },
  tableHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif'
  },
  sectionDesc: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.15rem'
  },
  filtersPanel: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
    backgroundColor: '#0d0d0d',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #242426',
    alignItems: 'center'
  },
  searchContainer: {
    position: 'relative',
    flex: 1
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)'
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#080808',
    border: '1px solid #242426',
    borderRadius: '6px',
    padding: '0.5rem 1rem 0.5rem 2rem',
    color: '#f8fafc',
    fontSize: '0.85rem'
  },
  selectorsRow: {
    display: 'flex',
    gap: '0.75rem'
  },
  selectWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    backgroundColor: '#161616',
    border: '1px solid #242426',
    borderRadius: '6px',
    padding: '0 0.4rem'
  },
  smallSelect: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#94a3b8',
    cursor: 'pointer',
    width: 'auto',
    padding: '0.4rem'
  },
  loadingSpinner: {
    padding: '4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyTable: {
    padding: '4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#64748b',
    gap: '0.25rem'
  },
  lockedRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.01)',
    opacity: '0.9'
  },
  actionCell: {
    display: 'flex',
    gap: '0.35rem',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  actionBtn: {
    padding: '0.25rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    borderRadius: '4px'
  },
  bottomSplit: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  suspiciousDeck: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '1rem',
    maxHeight: '260px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  suspiciousBlock: {
    backgroundColor: 'rgba(249, 115, 22, 0.03)',
    border: '1px solid rgba(249, 115, 22, 0.15)',
    borderRadius: '8px',
    padding: '0.75rem'
  },
  suspiciousText: {
    fontSize: '0.75rem',
    color: '#f97316',
    marginTop: '0.35rem',
    lineHeight: '1.4'
  },
  lockedDeck: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '1rem',
    maxHeight: '260px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  lockedBlock: {
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    borderRadius: '8px',
    padding: '0.75rem'
  },
  emptySplitText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.8rem',
    padding: '2rem 1rem'
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '200'
  },
  modalCard: {
    width: '560px',
    backgroundColor: '#161616',
    border: '1px solid #242426',
    borderRadius: '12px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    animation: 'fadeIn 0.25s ease-out forwards'
  },
  modalHeader: {
    padding: '1.25rem',
    borderBottom: '1px solid #242426',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '1.25rem'
  },
  jsonBlock: {
    backgroundColor: '#0d0d0d',
    border: '1px solid #242426',
    borderRadius: '8px',
    padding: '1rem',
    color: '#34d399',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    maxHeight: '180px',
    overflowY: 'auto',
    lineHeight: '1.5'
  },
  normComparisonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  normCompCell: {
    backgroundColor: '#161616',
    border: '1px solid #242426',
    borderRadius: '6px',
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem'
  },
  normCompLabel: {
    fontSize: '0.6rem',
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '700'
  },
  normCompVal: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#f8fafc'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    zIndex: '250',
    fontWeight: '600',
    fontSize: '0.85rem'
  }
};

export default App;
