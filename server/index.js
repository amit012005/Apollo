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
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pollapp';
mongoose.connect(mongoURI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.log('\n⚠️  MongoDB Connection Troubleshooting:');
  console.log('1. If using local MongoDB: Make sure MongoDB is running');
  console.log('   - Windows: Check MongoDB service is running');
  console.log('   - Or start with: mongod');
  console.log('2. If using MongoDB Atlas: Check your connection string in .env file');
  console.log('3. Current connection string:', mongoURI.replace(/\/\/.*@/, '//***:***@'));
});

// Routes
app.use('/api/polls', pollRoutes);
app.use('/api/votes', voteRoutes);

// Socket.io for real-time updates
const pollViewers = new Map(); // Track viewers per poll
const socketPolls = new Map(); // Track which polls each socket is in

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socketPolls.set(socket.id, new Set());

  socket.on('join-poll', (pollId) => {
    const polls = socketPolls.get(socket.id);
    
    // Prevent duplicate joins
    if (polls && polls.has(pollId)) {
      return;
    }
    
    socket.join(`poll-${pollId}`);
    
    // Track this socket in this poll
    if (polls) {
      polls.add(pollId);
    }
    
    // Count unique sockets in the poll room
    const room = io.sockets.adapter.rooms.get(`poll-${pollId}`);
    const viewerCount = room ? room.size : 0;
    pollViewers.set(pollId, viewerCount);
    
    // Notify all clients in the poll room about viewer count
    io.to(`poll-${pollId}`).emit('viewer-count', {
      pollId,
      count: viewerCount
    });
    
    console.log(`User ${socket.id} joined poll ${pollId} (${viewerCount} viewers)`);
  });

  socket.on('leave-poll', (pollId) => {
    const polls = socketPolls.get(socket.id);
    if (polls) {
      polls.delete(pollId);
    }
    
    socket.leave(`poll-${pollId}`);
    
    // Count unique sockets in the poll room
    const room = io.sockets.adapter.rooms.get(`poll-${pollId}`);
    const viewerCount = room ? room.size : 0;
    pollViewers.set(pollId, viewerCount);
    
    // Notify all clients about updated viewer count
    io.to(`poll-${pollId}`).emit('viewer-count', {
      pollId,
      count: viewerCount
    });
    
    console.log(`User ${socket.id} left poll ${pollId} (${viewerCount} viewers)`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Get all polls this socket was in
    const polls = socketPolls.get(socket.id);
    if (polls) {
      // Decrement viewer count for each poll
      polls.forEach((pollId) => {
        const room = io.sockets.adapter.rooms.get(`poll-${pollId}`);
        const viewerCount = room ? room.size : 0;
        pollViewers.set(pollId, viewerCount);
        
        // Notify remaining clients
        io.to(`poll-${pollId}`).emit('viewer-count', {
          pollId,
          count: viewerCount
        });
      });
      
      // Clean up
      socketPolls.delete(socket.id);
    }
  });
});

// Make io available to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
