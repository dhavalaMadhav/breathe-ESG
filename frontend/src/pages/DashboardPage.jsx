import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import { 
  Activity, Shield, AlertTriangle, CheckCircle, 
  ArrowUpRight, RefreshCw, Layers, TrendingUp
} from 'lucide-react';

const COLORS = ['#ef4444', '#3b82f6', '#a855f7']; // Scope 1, 2, 3 colors

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Compiling corporate environmental footprint ledger...</p>
      </div>
    );
  }

  const { summary = {}, scopes = [], trends = [], categories = [], sources = [] } = data || {};

  return (
    <div style={styles.container}>
      {/* Dashboard Top Row Header */}
      <div style={styles.dashboardHeader}>
        <div>
          <h1 style={styles.title}>ESG Executive Command Center</h1>
          <p style={styles.subtitle}>Audit-ready corporate carbon account ledger overview.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} />
          {refreshing ? 'Refreshing...' : 'Re-sync Ledger'}
        </button>
      </div>

      {/* 4 Executive KPI Summary Cards */}
      <div style={styles.kpiGrid}>
        <div className="glass-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>APPROVED CO₂e FOOTPRINT</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Shield size={20} />
            </div>
          </div>
          <div style={styles.kpiValueRow}>
            <span style={styles.kpiValue}>
              {summary.approvedCO2e ? (summary.approvedCO2e / 1000).toFixed(1) : '0.0'}
            </span>
            <span style={styles.kpiUnit}>tons CO₂e</span>
          </div>
          <p style={styles.kpiFooter}>
            <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center' }}>
              <ArrowUpRight size={14} /> 100% Locked
            </span>
            {' '}compliance verified
          </p>
        </div>

        <div className="glass-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>PENDING AUDIT QUEUE</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={styles.kpiValueRow}>
            <span style={styles.kpiValue}>{summary.pendingReviews || 0}</span>
            <span style={styles.kpiUnit}>records</span>
          </div>
          <p style={styles.kpiFooter}>
            <span style={{ color: '#3b82f6' }}>{summary.flaggedCount || 0} anomaly warnings</span> active in drawer
          </p>
        </div>

        <div className="glass-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>DISCARDED INVOICES</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={styles.kpiValueRow}>
            <span style={styles.kpiValue}>{summary.rejectedCount || 0}</span>
            <span style={styles.kpiUnit}>records</span>
          </div>
          <p style={styles.kpiFooter}>
            Flagged duplicate or empty claims
          </p>
        </div>

        <div className="glass-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>INGESTION JOBS COMPLETE</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
              <CheckCircle size={20} />
            </div>
          </div>
          <div style={styles.kpiValueRow}>
            <span style={styles.kpiValue}>{summary.totalUploads || 0}</span>
            <span style={styles.kpiUnit}>files</span>
          </div>
          <p style={styles.kpiFooter}>
            SAP exports & utility connectors
          </p>
        </div>
      </div>

      {/* Charts Layout - Split Screens */}
      <div style={styles.chartSplitGrid}>
        {/* Scope Split (Scope 1, 2, 3 Pie Chart) */}
        <div className="glass-card" style={styles.chartCard}>
          <div style={styles.chartTitleRow}>
            <Layers size={18} color="#10b981" />
            <h3 style={styles.chartTitle}>Footprint Share by Carbon Scope</h3>
          </div>
          <p style={styles.chartDesc}>Regulatory Greenhouse Gas classification divisions.</p>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={scopes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {scopes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value) => [`${(value).toLocaleString()} kg CO₂e`, 'Emissions']}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footprint Trends over time */}
        <div className="glass-card" style={styles.chartCard}>
          <div style={styles.chartTitleRow}>
            <TrendingUp size={18} color="#10b981" />
            <h3 style={styles.chartTitle}>Emissions Ingestion Timeline</h3>
          </div>
          <p style={styles.chartDesc}>Chronological tracking of carbon emissions month-on-month.</p>
          <div style={styles.chartContainer}>
            {trends.length === 0 ? (
              <div style={styles.emptyChart}>
                <p>No historical trends parsed yet. Try uploading utility/SAP files!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value) => [`${(value).toLocaleString()} kg CO₂e`, 'Emissions']}
                  />
                  <Line type="monotone" dataKey="co2e" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Chart - Top Emitting Categories Bar Chart */}
      <div className="glass-card" style={{ marginTop: '2rem' }}>
        <div style={styles.chartTitleRow}>
          <Layers size={18} color="#10b981" />
          <h3 style={styles.chartTitle}>Top Emitting Operational Activities</h3>
        </div>
        <p style={styles.chartDesc}>Granular breakdown of the organization's primary greenhouse emission channels.</p>
        <div style={{ marginTop: '1.5rem', minHeight: '260px' }}>
          {categories.length === 0 ? (
            <div style={styles.emptyChart}>
              <p>No operational classifications available. Seed the DB or approve records in queue!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categories} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value) => [`${(value).toLocaleString()} kg CO₂e`, 'Emissions']}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : (index === 1 ? '#3b82f6' : '#10b981')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    animation: 'fadeIn 0.4s ease-out forwards'
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh'
  },
  dashboardHeader: {
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
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  kpiCard: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '140px'
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  kpiTitle: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.05em'
  },
  kpiIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.35rem',
    margin: '0.75rem 0'
  },
  kpiValue: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif'
  },
  kpiUnit: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '600'
  },
  kpiFooter: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  chartSplitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
    gap: '2rem'
  },
  chartCard: {
    padding: '1.75rem'
  },
  chartTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },
  chartTitle: {
    fontSize: '1.2rem',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif'
  },
  chartDesc: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  chartContainer: {
    minHeight: '260px'
  },
  emptyChart: {
    height: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    border: '1px dashed #1e293b',
    borderRadius: '8px',
    textAlign: 'center',
    padding: '1rem'
  }
};

export default DashboardPage;
