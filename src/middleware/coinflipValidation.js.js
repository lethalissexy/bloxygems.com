const Inventory = require('../models/Inventory');

const validateCoinflipItems = async (req, res, next) => {
  try {
    // Get user's ID from session
    const userId = req.user.robloxId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Get the items being used
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items provided' });
    }

    // Get user's inventory
    const inventory = await Inventory.findOne({ robloxId: userId });
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Inventory not found' });
    }

    // Check each item
    const invalidItems = [];
    for (const item of items) {
      const itemsArray = item.game.toLowerCase() === 'mm2' ? inventory.mm2Items : inventory.ps99Items;
      
      // Find the item in user's inventory by instanceId
      const foundItem = itemsArray.find(i => i.instanceId === item.instanceId);
      
      if (!foundItem) {
        invalidItems.push(item.name);
        continue;
      }

      // Verify item details match
      if (foundItem.value !== item.value || foundItem.name !== item.name) {
        invalidItems.push(item.name);
      }
    }

    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some items are not in your inventory or have been modified',
        invalidItems
      });
    }

    // If we get here, all items are valid
    next();
  } catch (error) {
    console.error('Error in coinflip validation middleware:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during validation' });
  }
};

module.exports = { validateCoinflipItems }; 