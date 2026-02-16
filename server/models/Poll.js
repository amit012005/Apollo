const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  votes: {
    type: Number,
    default: 0
  }
});

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [optionSchema],
    required: true,
    validate: {
      validator: function(options) {
        return options && options.length >= 2;
      },
      message: 'Poll must have at least 2 options'
    }
  },
  pollId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  totalVotes: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Poll', pollSchema);
