const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authroutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

module.exports = app;