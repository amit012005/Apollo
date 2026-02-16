const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');

// Helper function to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'unknown';
};

// Helper function to get or create voter ID from cookie
const getVoterId = (req, res) => {
  let voterId = req.cookies.voterId;
  if (!voterId) {
    voterId = uuidv4();
    res.cookie('voterId', voterId, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      sameSite: 'lax'
    });
  }
  return voterId;
};

// Vote on a poll
router.post('/', async (req, res) => {
  try {
    const { pollId, optionIndex, fingerprint } = req.body;

    // Validation
    if (!pollId || optionIndex === undefined) {
      return res.status(400).json({ error: 'Poll ID and option index are required' });
    }

    if (!fingerprint) {
      return res.status(400).json({ error: 'Browser fingerprint is required for security' });
    }

    // Get poll
    const poll = await Poll.findOne({ pollId });
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Validate option index
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }

    const ipAddress = getClientIp(req);
    const voterId = getVoterId(req, res);

    // Anti-abuse mechanism 1: Check cookie (fastest check)
    const existingVoteByCookie = await Vote.findOne({ pollId, voterId });
    if (existingVoteByCookie) {
      return res.status(403).json({ 
        error: 'You have already voted on this poll',
        alreadyVoted: true,
        previousOptionIndex: existingVoteByCookie.optionIndex
      });
    }

    // Anti-abuse mechanism 2: Check fingerprint (prevents same browser voting twice)
    const existingVoteByFingerprint = await Vote.findOne({ pollId, fingerprint });
    if (existingVoteByFingerprint) {
      return res.status(403).json({ 
        error: 'You have already voted on this poll from this browser.',
        alreadyVoted: true,
        previousOptionIndex: existingVoteByFingerprint.optionIndex
      });
    }

    // Anti-abuse mechanism 3: STRICT - Only 1 vote per IP per poll (prevents different browsers on same device/network)
    const votesOnThisPollByIP = await Vote.countDocuments({
      pollId,
      ipAddress
    });

    if (votesOnThisPollByIP >= 1) {
      return res.status(403).json({ 
        error: 'This IP address/network has already voted on this poll. Each IP can only vote once per poll.',
        alreadyVoted: true
      });
    }

    // Anti-abuse mechanism 4: Rate limiting by IP address (global - prevents mass voting)
    const recentVotesByIP = await Vote.countDocuments({
      ipAddress,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

    if (recentVotesByIP >= 10) {
      return res.status(429).json({ 
        error: 'Too many votes from this IP address. Please try again later.' 
      });
    }

    // Create vote record
    const vote = new Vote({
      pollId,
      optionIndex,
      voterId,
      ipAddress,
      fingerprint
    });

    await vote.save();

    // Update poll vote count
    poll.options[optionIndex].votes += 1;
    poll.totalVotes += 1;
    await poll.save();

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`poll-${pollId}`).emit('poll-updated', {
        pollId: poll.pollId,
        question: poll.question,
        options: poll.options,
        totalVotes: poll.totalVotes
      });
    }

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      poll: {
        pollId: poll.pollId,
        question: poll.question,
        options: poll.options,
        totalVotes: poll.totalVotes
      }
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Check if user has already voted
router.get('/check/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { fingerprint } = req.query;
    const voterId = req.cookies.voterId;

    let hasVoted = false;
    let optionIndex = null;

    // Check by cookie
    if (voterId) {
      const voteByCookie = await Vote.findOne({ pollId, voterId });
      if (voteByCookie) {
        hasVoted = true;
        optionIndex = voteByCookie.optionIndex;
      }
    }

    // Check by fingerprint (more reliable)
    if (!hasVoted && fingerprint) {
      const voteByFingerprint = await Vote.findOne({ pollId, fingerprint });
      if (voteByFingerprint) {
        hasVoted = true;
        optionIndex = voteByFingerprint.optionIndex;
      }
    }

    res.json({ 
      hasVoted,
      optionIndex
    });
  } catch (error) {
    console.error('Error checking vote:', error);
    res.status(500).json({ error: 'Failed to check vote status' });
  }
});

module.exports = router;
