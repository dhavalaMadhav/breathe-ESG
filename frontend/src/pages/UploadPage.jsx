import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Upload, FileText, CheckCircle, AlertTriangle, 
  ArrowRight, ShieldCheck, Database, Calendar, Play
} from 'lucide-react';

const SAMPLES = {
  SAP: `Materialnummer,Werk,Kraftstofftyp,Menge,Einheit,Lieferant,Kostenstelle,Buchungsdatum,Waehrung
MAT-5021,Plant Alpha,Diesel,3800,Liters,Chevron Inc.,CC-MAN-01,15.04.2026,USD
MAT-5022,Plant Beta,Petrol,1200,Gallons,Shell Global,CC-LOG-02,18.04.2026,USD
MAT-5023,Plant Alpha,Natural Gas,4200,kg,Enbridge Gas,CC-MAN-01,20.04.2026,USD`,

  Utility: `meterId,billingPeriodStart,billingPeriodEnd,kWhConsumed,tariff,peakUsage,location
MET-1002,2026-04-01,2026-04-30,15800,Industrial Peak,140,North America
MET-1002,2026-04-15,2026-05-15,16200,Industrial Peak,145,North America`, // duplicate billing period warning

  Travel: `employeeId,travelCategory,origin,destination,classType,hotelNights,taxiDistance,date
EMP-099,Flights,JFK,LHR,Business,0,0,2026-04-12
EMP-099,Hotels,,,Deluxe Room,4,0,2026-04-12
EMP-104,Flights,XYZ,SIN,Economy,0,0,2026-04-20
EMP-105,Ground Transport,,,Diesel Car,0,180,2026-04-22` // XYZ invalid airport code
};

const UploadPage = () => {
  const [sourceType, setSourceType] = useState('SAP');
  const [csvContent, setCsvContent] = useState(SAMPLES.SAP);
  const [fileName, setFileName] = useState('sample_sap_procurement.csv');
  const [isParsing, setIsParsing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0=Idle, 1=Parse, 2=Normalize, 3=Anomaly Scan, 4=Sync, 5=Complete
  const [jobSummary, setJobSummary] = useState(null);
  const [jobsList, setJobsList] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchJobs = async () => {
    try {
      const response = await api.get('/ingestion/jobs');
      setJobsList(response.data);
    } catch (err) {
      console.error('Failed to load jobs ledger:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSourceChange = (type) => {
    setSourceType(type);
    setCsvContent(SAMPLES[type]);
    setFileName(`sample_${type.toLowerCase()}_export.csv`);
    setJobSummary(null);
    setPipelineStep(0);
    setErrorMsg('');
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Only CSV spreadsheets are supported in standard ingestion portals.');
      return;
    }
    setFileName(file.name);
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCsvContent(evt.target.result);
    };
    reader.readAsText(file);
  };

  const triggerIngestion = async () => {
    setIsParsing(true);
    setJobSummary(null);
    setErrorMsg('');
    
    // Animate Pipeline Stages
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    
    setPipelineStep(1); // Stage 1: File Ingestion
    await delay(700);
    
    setPipelineStep(2); // Stage 2: Schema Mapping & Header Translating
    await delay(900);
    
    setPipelineStep(3); // Stage 3: Unit Standardization Engine
    await delay(800);
    
    setPipelineStep(4); // Stage 4: AI Anomaly and Overlap scanning
    await delay(800);

    // Create virtual File object to upload via FormData
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], fileName, { type: 'text/csv' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', sourceType);

    try {
      const response = await api.post('/ingestion/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setJobSummary(response.data);
      setPipelineStep(5); // Complete!
      fetchJobs();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Ingestion pipeline encounterd an unhandled error.');
      setPipelineStep(0);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>ESG Ingestion Command Center</h1>
          <p style={styles.subtitle}>Upload enterprise ERP data exports, utility bill sheets, and flight charts.</p>
        </div>
      </div>

      <div style={styles.splitLayout}>
        {/* Left Side - Upload Controls */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Source Selection & Drag-Drop */}
          <div className="glass-card">
            <h3 style={styles.cardTitle}>1. Configure Data Source Gateway</h3>
            <p style={styles.cardDesc}>Select source structure to activate correct mapping tables.</p>
            
            <div style={styles.sourceGrid}>
              {['SAP', 'Utility', 'Travel'].map(t => (
                <button
                  key={t}
                  style={{ ...styles.sourceBtn, ...(sourceType === t ? styles.activeSource : {}) }}
                  onClick={() => handleSourceChange(t)}
                  disabled={isParsing}
                >
                  <Database size={16} />
                  <span>{t === 'SAP' ? 'SAP Fuel ERP' : (t === 'Utility' ? 'Utility Billing' : 'Business Travel')}</span>
                </button>
              ))}
            </div>

            {/* Drag & Drop Area */}
            <div 
              style={styles.dropzone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <Upload size={36} color="#10b981" style={{ marginBottom: '1rem' }} />
              <p style={styles.dropText}>Drag and drop CSV spreadsheet here or</p>
              <label style={styles.fileSelectBtn}>
                Browse Workspace
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileSelect} disabled={isParsing} />
              </label>
              <p style={styles.fileHint}>Supports raw CSV, TXT exports up to 5MB.</p>
            </div>

            {fileName && (
              <div style={styles.fileBox}>
                <FileText size={18} color="#10b981" />
                <span style={styles.fileName}>{fileName}</span>
                <span style={styles.fileStatus}>Pre-mapped ready</span>
              </div>
            )}

            {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
          </div>

          {/* Code/CSV Content Preview */}
          <div className="glass-card">
            <h3 style={styles.cardTitle}>2. Raw Ingest Stream Preview</h3>
            <p style={styles.cardDesc}>Verify schema headers and transaction fields before pipeline execution.</p>
            <textarea
              style={styles.csvEditor}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              disabled={isParsing}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Total rows: {csvContent.split('\n').filter(Boolean).length - 1} data records.
              </span>
              <button 
                className="btn btn-primary" 
                onClick={triggerIngestion} 
                disabled={isParsing || !csvContent.trim()}
              >
                <Play size={16} />
                {isParsing ? 'Processing Pipeline...' : 'Trigger Ingestion Pipeline'}
              </button>
            </div>
          </div>

        </div>

        {/* Right Side - Normalization Pipeline Stepper & Results */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Normalization Pipeline Stepper */}
          <div className="glass-card">
            <h3 style={styles.cardTitle}>Transformation Pipeline Engine</h3>
            <p style={styles.cardDesc}>Live status tracking of standard calculations.</p>
            
            <div style={styles.pipelineTimeline}>
              <div style={{ ...styles.pipelineStep, ...(pipelineStep >= 1 ? styles.activePipelineStep : {}) }}>
                <div style={styles.pipelineDot}>1</div>
                <div style={styles.pipelineText}>
                  <h4 style={styles.pipelineTitle}>Raw File Upload & Validation</h4>
                  <p style={styles.pipelineSub}>Check column formats and reject corrupt sheets.</p>
                </div>
              </div>

              <div style={{ ...styles.pipelineStep, ...(pipelineStep >= 2 ? styles.activePipelineStep : {}) }}>
                <div style={styles.pipelineDot}>2</div>
                <div style={styles.pipelineText}>
                  <h4 style={styles.pipelineTitle}>Schema Mapping & German Translation</h4>
                  <p style={styles.pipelineSub}>Translate ERP headers (Werk, Brennstoff, Einheit).</p>
                </div>
              </div>

              <div style={{ ...styles.pipelineStep, ...(pipelineStep >= 3 ? styles.activePipelineStep : {}) }}>
                <div style={styles.pipelineDot}>3</div>
                <div style={styles.pipelineText}>
                  <h4 style={styles.pipelineTitle}>Unit Standardization & Factor Math</h4>
                  <p style={styles.pipelineSub}>Convert Gal/Ltrs, MWh/kWh, Miles/Km to base values.</p>
                </div>
              </div>

              <div style={{ ...styles.pipelineStep, ...(pipelineStep >= 4 ? styles.activePipelineStep : {}) }}>
                <div style={styles.pipelineDot}>4</div>
                <div style={styles.pipelineText}>
                  <h4 style={styles.pipelineTitle}>AI Anomaly & Chrono Overlap Scan</h4>
                  <p style={styles.pipelineSub}>Flag Z-Score outliers, duplicates, and utility overlaps.</p>
                </div>
              </div>

              <div style={{ ...styles.pipelineStep, ...(pipelineStep >= 5 ? styles.activePipelineStep : {}) }}>
                <div style={styles.pipelineDot}><ShieldCheck size={14} /></div>
                <div style={styles.pipelineText}>
                  <h4 style={styles.pipelineTitle}>Audit Ledger Integration Complete</h4>
                  <p style={styles.pipelineSub}>Generate immutable logs and feed review queue.</p>
                </div>
              </div>
            </div>

            {/* Ingestion Job Stats Summary Card */}
            {jobSummary && (
              <div style={styles.summaryCard} className="fade-in">
                <h4 style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                  <CheckCircle size={18} color="#10b981" /> Ingestion Completed!
                </h4>
                <div style={styles.summaryStats}>
                  <div style={styles.summaryStatItem}>
                    <span style={styles.sumStatLabel}>Ingested Rows</span>
                    <span style={styles.sumStatVal}>{jobSummary.validRows}</span>
                  </div>
                  <div style={styles.summaryStatItem}>
                    <span style={styles.sumStatLabel}>Invalid/Failed</span>
                    <span style={{ ...styles.sumStatVal, color: jobSummary.invalidRows > 0 ? '#ef4444' : '#64748b' }}>{jobSummary.invalidRows}</span>
                  </div>
                  <div style={styles.summaryStatItem}>
                    <span style={styles.sumStatLabel}>Flagged Anomalies</span>
                    <span style={{ ...styles.sumStatVal, color: jobSummary.anomaliesFound > 0 ? '#f97316' : '#10b981' }}>{jobSummary.anomaliesFound}</span>
                  </div>
                </div>
                {jobSummary.errors && jobSummary.errors.length > 0 && (
                  <div style={styles.errorLogs}>
                    <p style={{ fontWeight: '600', color: '#ef4444', marginBottom: '0.25rem' }}>Failed Row Logs:</p>
                    {jobSummary.errors.map((e, idx) => (
                      <p key={idx} style={{ fontSize: '0.75rem', color: '#94a3b8' }}>• {e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Historical Ingestion Jobs Ledger */}
      <div className="glass-card" style={{ marginTop: '2.5rem' }}>
        <h3 style={styles.cardTitle}>Automated Connectors & Ingestion Logs</h3>
        <p style={styles.cardDesc}>Chronological history of file imports, system processing status, and auditing links.</p>
        
        <div className="table-container" style={{ marginTop: '1.25rem' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>JOB REFERENCE</th>
                <th>IMPORT TYPE</th>
                <th>FILE METADATA</th>
                <th>EXECUTION TIME</th>
                <th>STATUS</th>
                <th>RECORD METRICS</th>
                <th>IMPORTED BY</th>
              </tr>
            </thead>
            <tbody>
              {jobsList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>No ingestion logs found. Use the panel above to ingest your first CSV!</td>
                </tr>
              ) : (
                jobsList.map(job => (
                  <tr key={job._id}>
                    <td style={{ fontWeight: '600', color: '#10b981', fontFamily: 'monospace' }}>
                      #{job._id.toString().substring(18)}
                    </td>
                    <td>
                      <span className={`badge badge-scope-${job.sourceType === 'SAP' ? '1' : (job.sourceType === 'Utility' ? '2' : '3')}`}>
                        {job.sourceType === 'SAP' ? 'SAP FUEL' : (job.sourceType === 'Utility' ? 'UTILITY BILL' : 'BIZ TRAVEL')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{job.fileName}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{(job.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8' }}>
                        <Calendar size={14} />
                        <span>{new Date(job.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${job.status === 'Completed' ? 'approved' : 'rejected'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ color: '#10b981' }}>{job.validRows} valid</span>
                        {job.invalidRows > 0 && <span style={{ color: '#ef4444' }}>{job.invalidRows} failed</span>}
                      </div>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{job.uploadedBy?.name || 'David Vance'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    alignItems: 'flex-start'
  },
  cardTitle: {
    fontSize: '1.25rem',
    color: '#f8fafc',
    marginBottom: '0.35rem',
    fontFamily: 'Outfit, sans-serif'
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  sourceGrid: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  sourceBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#101726',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s ease'
  },
  activeSource: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    color: '#10b981'
  },
  dropzone: {
    border: '2px dashed #1e293b',
    borderRadius: '10px',
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  dropText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginBottom: '0.75rem'
  },
  fileSelectBtn: {
    backgroundColor: '#10b981',
    color: '#042f1a',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
  },
  fileHint: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.75rem'
  },
  fileBox: {
    marginTop: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px'
  },
  fileName: {
    fontWeight: '600',
    fontSize: '0.85rem',
    color: '#f8fafc',
    flex: 1
  },
  fileStatus: {
    fontSize: '0.75rem',
    color: '#10b981',
    fontWeight: '600'
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '0.75rem',
    fontSize: '0.8rem',
    marginTop: '1rem'
  },
  csvEditor: {
    width: '100%',
    height: '140px',
    backgroundColor: '#060911',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    color: '#34d399',
    fontFamily: 'monospace',
    padding: '1rem',
    fontSize: '0.8rem',
    resize: 'none',
    lineHeight: '1.5'
  },
  pipelineTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    position: 'relative'
  },
  pipelineStep: {
    display: 'flex',
    gap: '1rem',
    opacity: '0.35',
    transition: 'all 0.3s ease'
  },
  activePipelineStep: {
    opacity: '1'
  },
  pipelineDot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: '700',
    border: '1.5px solid #1e293b'
  },
  pipelineText: {
    flex: 1
  },
  pipelineTitle: {
    fontSize: '0.9rem',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif'
  },
  pipelineSub: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.15rem'
  },
  summaryCard: {
    marginTop: '2rem',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '10px',
    padding: '1.25rem'
  },
  summaryStats: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem'
  },
  summaryStatItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#0b0f19',
    border: '1px solid #1e293b',
    borderRadius: '8px'
  },
  sumStatLabel: {
    fontSize: '0.7rem',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: '0.25rem'
  },
  sumStatVal: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#f8fafc'
  },
  errorLogs: {
    marginTop: '1rem',
    backgroundColor: '#060911',
    borderRadius: '6px',
    padding: '0.75rem',
    border: '1px solid #1e293b'
  }
};

export default UploadPage;
