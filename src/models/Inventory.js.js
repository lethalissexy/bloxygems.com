const mongoose = require('mongoose');

// Schema for items in inventory
const InventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  type: {
    type: String,
    required: true,
    default: 'pet'
  },
  game: {
    type: String,
    required: true,
    default: 'PS99'
  },
  image: {
    type: String,
    default: ''
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  instanceId: {
    type: String,
    default: function() {
      return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }
}, { _id: false });

// Main inventory schema
const InventorySchema = new mongoose.Schema({
  robloxId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  displayName: {
    type: String
  },
  avatar: {
    type: String
  },
  mm2Items: {
    type: [InventoryItemSchema],
    default: []
  },
  ps99Items: {
    type: [InventoryItemSchema],
    default: []
  },
  stats: {
    mm2: {
      itemCount: { type: Number, default: 0 },
      totalValue: { type: Number, default: 0 },
      profit: { type: Number, default: 0 },
      wager: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    ps99: {
      itemCount: { type: Number, default: 0 },
      totalValue: { type: Number, default: 0 },
      profit: { type: Number, default: 0 },
      wager: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    overall: {
      totalValue: { type: Number, default: 0 },
      profit: { type: Number, default: 0 },
      wager: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound indexes for better performance and uniqueness
InventorySchema.index({ robloxId: 1 }, { unique: true });
InventorySchema.index({ username: 1 });
InventorySchema.index({ 'mm2Items.instanceId': 1 }, { sparse: true });
InventorySchema.index({ 'ps99Items.instanceId': 1 }, { sparse: true });

// Helper methods
InventorySchema.methods.addItems = async function(items) {
  for (const item of items) {
    const itemsArray = item.game === 'MM2' ? this.mm2Items : this.ps99Items;
    const stats = item.game === 'MM2' ? this.stats.mm2 : this.stats.ps99;
    
    // Add item to array
    itemsArray.push({
      name: item.name,
      value: item.value,
      quantity: item.quantity || 1,
      type: item.type || 'pet',
      game: item.game || 'PS99',
      image: item.image || '',
      addedAt: new Date(),
      instanceId: item.instanceId || `${item.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // Update stats
    stats.itemCount += item.quantity || 1;
    stats.totalValue += (item.value * (item.quantity || 1));
  }

  // Update overall stats
  this.stats.overall.totalValue = this.stats.mm2.totalValue + this.stats.ps99.totalValue;

  return this.save();
};

InventorySchema.methods.removeItems = async function(items) {
  for (const item of items) {
    const itemsArray = item.game === 'MM2' ? this.mm2Items : this.ps99Items;
    const stats = item.game === 'MM2' ? this.stats.mm2 : this.stats.ps99;
    
    const index = itemsArray.findIndex(i => i.instanceId === item.instanceId);
    if (index >= 0) {
      const removedItem = itemsArray[index];
      // Update stats
      stats.itemCount -= removedItem.quantity;
      stats.totalValue -= (removedItem.value * removedItem.quantity);
      // Remove item
      itemsArray.splice(index, 1);
    }
  }

  // Update overall stats
  this.stats.overall.totalValue = this.stats.mm2.totalValue + this.stats.ps99.totalValue;

  return this.save();
};

// Update timestamps on save
InventorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create model
const Inventory = mongoose.model('Inventory', InventorySchema);

module.exports = Inventory; 