const mongoose = require('mongoose');

const coinflipSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true
  },
  totalValue: {
    type: Number,
    default: function() {
      return this.value; // Start with creator's value
    }
  },
  joinRangeMin: {
    type: Number,
    required: true
  },
  joinRangeMax: {
    type: Number,
    required: true
  },
  creator: {
    type: String,
    required: true
  },
  creatorAvatar: {
    type: String,
    default: null
  },
  creatorItems: {
    type: Array,
    required: true,
    default: []
  },
  creatorSide: {
    type: String,
    enum: ['heads', 'tails'],
    required: true
  },
  joiner: {
    type: String,
    default: null
  },
  joinerAvatar: {
    type: String,
    default: null
  },
  joinerItems: {
    type: Array,
    default: []
  },
  // Add provably fair fields
  serverSeed: {
    type: String,
    default: null
  },
  serverSeedHash: {
    type: String,
    required: true
  },
  randomSeed: {
    type: String,
    default: null
  },
  normalizedResult: {
    type: Number,
    default: null
  },
  winnerSide: {
    type: String,
    enum: ['heads', 'tails', null],
    default: null
  },
  state: {
    type: String,
    enum: ['active', 'ended', 'canceled'],
    default: 'active'
  },
  winner: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  }
});

// Create indexes for better query performance
coinflipSchema.index({ state: 1 });
coinflipSchema.index({ creator: 1 });
coinflipSchema.index({ joiner: 1 });
coinflipSchema.index({ createdAt: -1 });

// Add a method to calculate join range and determine winner
coinflipSchema.pre('save', function(next) {
  if (this.isNew) {
    // Calculate 5% range
    const fivePercent = this.value * 0.05;
    this.joinRangeMin = this.value - fivePercent;
    this.joinRangeMax = this.value + fivePercent;
  }
  
  // Update total value when game is joined
  if (this.joiner && this.joinerItems.length > 0) {
    const joinerValue = this.joinerItems.reduce((sum, item) => sum + item.value, 0);
    this.totalValue = this.value + joinerValue;
  }

  // If game is ending, determine winner side
  if (this.state === 'ended' && this.normalizedResult !== null) {
    // Use normalized result to determine winner side (0.5 threshold)
    this.winnerSide = this.normalizedResult < 0.5 ? 'heads' : 'tails';
    // Set winner based on chosen sides
    this.winner = this.winnerSide === this.creatorSide ? this.creator : this.joiner;
  }
  
  next();
});

module.exports = mongoose.model('Coinflip', coinflipSchema); 