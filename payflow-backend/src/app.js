const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();

// CORS configuration allowing localhost and any local network IP on port 5173
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      // Matches localhost, 127.0.0.1, or local subnet IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on port 5173
      const isAllowedOrigin =
        /^http:\/\/localhost:5173$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:5173$/.test(origin) ||
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/.test(origin) ||
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/.test(origin) ||
        /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/.test(origin);

      if (isAllowedOrigin) {
        return callback(null, true);
      } else {
        return callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

module.exports = app;