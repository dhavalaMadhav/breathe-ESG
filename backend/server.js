const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const ingestionRoutes = require('./routes/ingestionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const auditRoutes = require('./routes/auditRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const orgRoutes = require('./routes/orgRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/esg_platform';

// Standard security & operational middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://breathe-esg-ivory.vercel.app/'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    time: new Date(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// Route Mountings
app.use('/api/auth', authRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Exception:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected operational breakdown occurred on the server.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Graceful Database Connection & Server Startup
console.log('Connecting to database...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully.');
    app.listen(PORT, () => {
      console.log(`🚀 Breathe ESG Enterprise Backend active on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Mongoose database connection failed.');
    console.error('⚠️ Detailed Error:', err.message);
    console.log('\n--------------------------------------------------------------');
    console.log('⚠️ MongoDB is not active or could not be contacted.');
    console.log('💡 Running server in degraded state (health checks will report OFFLINE).');
    console.log('--------------------------------------------------------------\n');

    // Start server anyway so frontend can bind and display detailed database instructions
    app.listen(PORT, () => {
      console.log(`🚀 Breathe ESG Degradable Backend running on port ${PORT}`);
    });
  });
