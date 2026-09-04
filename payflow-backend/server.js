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

// Configure Socket.IO with CORS supporting dynamic local network origins
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isAllowedOrigin =
        /^http:\/\/localhost:5173$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:5173$/.test(origin) ||
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/.test(origin) ||
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/.test(origin) ||
        /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/.test(origin);

      if (isAllowedOrigin) {
        return callback(null, true);
      } else {
        return callback(new Error('Blocked by CORS on Socket.IO'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io instance to express app
app.set('io', io);

// Socket.IO Connection & Room Management
io.on('connection', (socket) => {
  socket.on('join_wallet', (userId) => {
    if (userId) {
      socket.join(userId.toString());
    }
  });

  socket.on('disconnect', () => {});
});

// Bind to 0.0.0.0 so external devices (like your iPhone) can reach port 5001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});