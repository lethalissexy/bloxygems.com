const express = require('express');
const router = express.Router();
const Withdraw = require('../../models/Withdraw');
const { auth } = require('../../middleware/auth');
const mongoose = require('mongoose');

router.post('/create', auth, async (req, res) => {
  try {
    const { items, totalValue } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected for withdrawal' });
    }

    // Create withdrawal request
    const withdraw = new Withdraw({
      userId: req.user.robloxId,
      username: req.user.username,
      items: items.map(item => ({
        name: item.name,
        value: item.value,
        image: item.image,
        instanceId: item.instanceId
      })),
      totalValue
    });

    // Remove items from user's inventory using robloxId
    const db = mongoose.connection.db;
    await db.collection('inventories').updateOne(
      { robloxId: req.user.robloxId },
      {
        $pull: {
          ps99Items: {
            instanceId: {
              $in: items.map(item => item.instanceId)
            }
          }
        },
        $inc: {
          'stats.ps99.itemCount': -items.length,
          'stats.ps99.totalValue': -totalValue,
          'stats.overall.totalValue': -totalValue
        }
      }
    );

    await withdraw.save();

    res.json({
      success: true,
      message: 'Withdrawal request created successfully',
      withdraw
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Error processing withdrawal' });
  }
});

module.exports = router; 