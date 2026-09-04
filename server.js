require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Create HTTP Server
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to Express app instance
app.set('io', io);

// Socket.io Connection & Room Logic
io.on('connection', (socket) => {
  socket.on('join_wallet', (userId) => {
    socket.join(userId);
  });

  socket.on('disconnect', () => {});
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});