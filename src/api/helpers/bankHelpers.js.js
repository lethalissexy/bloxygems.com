/**
 * Helper functions for working with user inventories/banks
 */

const { MongoClient } = require('mongodb');

/**
 * Get a user's inventory (bank) by their user ID
 * @param {string} userId The user's ID
 * @returns {Promise<Object>} The user's inventory data
 */
const getBankById = async (userId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bloxycoins');
    const db = client.db();
    
    // Find user's inventory
    const inventory = await db.collection('inventories').findOne({ robloxId: String(userId) });
    
    return inventory || { ps99Items: [] }; // Return empty inventory if not found
  } catch (error) {
    console.error('Error in getBankById:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
};

module.exports = {
  getBankById
}; 