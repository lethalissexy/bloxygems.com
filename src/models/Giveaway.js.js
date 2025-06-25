const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the item schema separately for clarity
const itemSchema = new Schema({
  instanceId: {
    type: String,
    required: true
  },
  id: String,
  assetId: String,
  name: String,
  type: String,
  value: Number,
  rarity: String,
  image: String,
  game: String,
  quantity: Number,
  addedAt: Date
});

const giveawaySchema = new Schema({
  creatorId: {
    type: String,
    required: true,
    index: true
  },
  creatorUsername: {
    type: String,
    required: true
  },
  creatorAvatar: {
    type: String
  },
  items: [itemSchema], // Using the item schema defined above
  endTime: {
    type: Date,
    required: true,
    index: true
  },
  totalValue: {
    type: Number,
    default: 0
  },
  numWinners: {
    type: Number,
    required: true,
    min: 1
  },
  itemsPerWinner: Number,
  participants: [{
    userId: String,
    robloxId: String,
    username: String,
    avatar: String,
    enteredAt: {
      type: Date,
      default: Date.now
    }
  }],
  participantCount: {
    type: Number,
    default: 0
  },
  winners: [{
    userId: String,
    username: String,
    avatar: String,
    items: [itemSchema] // Using the same item schema for winner items
  }],
  isCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
giveawaySchema.index({ isCompleted: 1, endTime: 1 });
giveawaySchema.index({ creatorId: 1, isCompleted: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema); 