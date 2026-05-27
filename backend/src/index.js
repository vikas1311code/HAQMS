require('dotenv').config(); // FIRST — before everything else
console.log("DATABASE_URL =", process.env.DATABASE_URL);
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queue');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// FIX: Restrict CORS to known origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'HAQMS Backend API',
    status: 'Running',
    version: '1.0.0-fixed',
  });
});

// FIX: Global error handler — no stack trace leaked to client
app.use((err, req, res, next) => {
  console.error('[CRITICAL-ERROR]:', err);
  res.status(500).json({
    message: 'An unexpected internal server error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`   HAQMS BACKEND SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(`   ENVIRONMENT: ${process.env.NODE_ENV}`);
  console.log(`===================================================`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});