const mongoose = require('mongoose');

const withdrawItemSchema = new mongoose.Schema({
  name: String,
  value: Number,
  image: String,
  instanceId: String
});

const withdrawSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  items: [withdrawItemSchema],
  totalValue: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Withdraw', withdrawSchema); 