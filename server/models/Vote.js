const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  pollId: {
    type: String,
    required: true,
    index: true
  },
  optionIndex: {
    type: Number,
    required: true
  },
  voterId: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  fingerprint: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Compound indexes to prevent duplicate votes
  indexes: [
    { pollId: 1, voterId: 1 },
    { pollId: 1, fingerprint: 1 },
    { pollId: 1, ipAddress: 1, createdAt: -1 }
  ]
});

module.exports = mongoose.model('Vote', voteSchema);
