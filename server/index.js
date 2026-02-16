const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pollRoutes = require('./routes/polls');
const voteRoutes = require('./routes/votes');

const app = express();
const server = http.createServer(app);

// 1. Determine the allowed origin based on environment
const allowedOrigin = process.env.NODE_ENV === 'production' 
  ? undefined 
  : (process.env.CLIENT_URL || "http://localhost:5173");

const io = socketIo(server, {
  cors: {
    origin: allowedOrigin || "*", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigin || "*",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pollapp';
mongoose.connect(mongoURI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err.message));

// API Routes
app.use('/api/polls', pollRoutes);
app.use('/api/votes', voteRoutes);

// 2. Serve Frontend Static Files (Production Mode)

app.use(express.static(path.join(__dirname, 'public')));

// Handle React routing, return index.html for all non-API requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// -------------------------------------------------------------------------

// Socket.io Logic
const pollViewers = new Map();
const socketPolls = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socketPolls.set(socket.id, new Set());

  socket.on('join-poll', (pollId) => {
    const polls = socketPolls.get(socket.id);
    if (polls && polls.has(pollId)) return;
    
    socket.join(`poll-${pollId}`);
    if (polls) polls.add(pollId);
    
    const room = io.sockets.adapter.rooms.get(`poll-${pollId}`);
    const viewerCount = room ? room.size : 0;
    pollViewers.set(pollId, viewerCount);
    
    io.to(`poll-${pollId}`).emit('viewer-count', { pollId, count: viewerCount });
  });

  socket.on('leave-poll', (pollId) => {
    const polls = socketPolls.get(socket.id);
    if (polls) polls.delete(pollId);
    
    socket.leave(`poll-${pollId}`);
    
    const room = io.sockets.adapter.rooms.get(`poll-${pollId}`);
    const viewerCount = room ? room.size : 0;
    pollViewers.set(pollId, viewerCount);
    
    io.to(`poll-${pollId}`).emit('viewer-count', { pollId, count: viewerCount });
  });

  socket.on('disconnect', () => {
    const polls = socketPolls.get(socket.id);
    if (polls) {
      polls.forEach((pollId) => {
        const room = io.sockets.adapter.rooms.get(`poll-${pollId}`);
        const viewerCount = room ? room.size : 0;
        pollViewers.set(pollId, viewerCount);
        io.to(`poll-${pollId}`).emit('viewer-count', { pollId, count: viewerCount });
      });
      socketPolls.delete(socket.id);
    }
  });
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});