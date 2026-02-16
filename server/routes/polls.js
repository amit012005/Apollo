const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Poll = require('../models/Poll');

// Create a new poll
router.post('/', async (req, res) => {
  try {
    const { question, options } = req.body;

    // Validation
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ 
        error: 'Poll must have a question and at least 2 options' 
      });
    }

    // Validate option texts
    const validOptions = options.filter(opt => opt && opt.trim().length > 0);
    if (validOptions.length < 2) {
      return res.status(400).json({ 
        error: 'Poll must have at least 2 valid options' 
      });
    }

    // Generate unique poll ID
    const pollId = uuidv4();

    // Create poll with options
    const pollOptions = validOptions.map(text => ({
      text: text.trim(),
      votes: 0
    }));

    const poll = new Poll({
      question: question.trim(),
      options: pollOptions,
      pollId: pollId
    });

    await poll.save();

    res.status(201).json({
      success: true,
      poll: {
        pollId: poll.pollId,
        question: poll.question,
        options: poll.options,
        createdAt: poll.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Get a poll by ID
router.get('/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findOne({ pollId });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({
      success: true,
      poll: {
        pollId: poll.pollId,
        question: poll.question,
        options: poll.options,
        totalVotes: poll.totalVotes,
        createdAt: poll.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

module.exports = router;
