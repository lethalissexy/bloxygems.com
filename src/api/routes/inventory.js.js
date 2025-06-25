const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// Get all users (for admin panel)
router.get('/users', async (req, res) => {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const usersCollection = db.collection('users');
    
    const users = await usersCollection.find({}, { projection: { _id: 1, username: 1 } }).toArray();
    await client.close();
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's inventory
router.get('/inventory/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const inventoriesCollection = db.collection('inventories');
    
    const inventory = await inventoriesCollection.findOne({ robloxId: userId });
    await client.close();
    
    if (!inventory) {
      return res.json({ 
        inventory: { 
          mm2Items: [], 
          ps99Items: [] 
        } 
      });
    }

    res.json({ 
      inventory: {
        mm2Items: inventory.mm2Items || [],
        ps99Items: inventory.ps99Items || []
      } 
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to user's inventory (admin only)
router.post('/inventory/:userId/add', async (req, res) => {
  const { userId } = req.params;
  const { name, value, quantity, rarity, game, image } = req.body;

  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const inventoriesCollection = db.collection('inventories');

    // First, create or find the item
    const item = await inventoriesCollection.findOneAndUpdate(
      { robloxId: userId, game },
      {
        $push: {
          items: {
            name,
            value,
            quantity,
            rarity,
            image,
            addedAt: new Date()
          }
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ success: true, inventory: item.value });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove items from user's inventory
router.post('/inventory/:userId/remove', async (req, res) => {
  const { userId } = req.params;
  const { itemIds } = req.body;

  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const inventoriesCollection = db.collection('inventories');

    // Remove the specified items from the user's inventory
    await inventoriesCollection.updateOne(
      { robloxId: userId },
      {
        $pull: {
          items: {
            instanceId: {
              $in: itemIds
            }
          }
        }
      }
    );

    await client.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin route for adding items to user inventory
router.post('/admin/inventory/add', async (req, res) => {
  try {
    const { userId, items } = req.body;
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const inventoriesCollection = db.collection('inventories');

    const operations = items.map(item => ({
      updateOne: {
        filter: { userId, game: item.game },
        update: {
          $push: {
            items: {
              name: item.name,
              value: item.value,
              quantity: item.quantity,
              image: item.image,
              addedAt: new Date()
            }
          }
        },
        upsert: true
      }
    }));

    await inventoriesCollection.bulkWrite(operations);
    await client.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding items to inventory:', error);
    res.status(500).json({ error: 'Error adding items to inventory' });
  }
});

// Handle item tips between users
router.post('/tip', async (req, res) => {
  let client = null;
  try {
    console.log('Received tip request:', req.body);
    const { senderId, recipientId, items } = req.body;
    
    // Ensure we have all required data and convert to strings
    if (!senderId || !recipientId || !items || !Array.isArray(items) || items.length === 0) {
      console.log('Invalid request data:', { senderId, recipientId, itemsLength: items ? items.length : 0 });
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Convert IDs to strings if they aren't already
    const senderIdStr = String(senderId);
    const recipientIdStr = String(recipientId);
    
    console.log('Processing tip from sender', senderIdStr, 'to recipient', recipientIdStr);
    
    // Debug MongoDB connection
    console.log('Connecting to MongoDB with URI:', process.env.MONGODB_URI ? 'URI exists' : 'URI is missing');
    try {
      client = await MongoClient.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000 // 5 second timeout
      });
      console.log('MongoDB connection successful');
    } catch (connErr) {
      console.error('MongoDB connection error:', connErr);
      return res.status(500).json({ error: 'Failed to connect to database', message: connErr.message });
    }
    
    const db = client.db('test');
    const inventoriesCollection = db.collection('inventories');
    const usersCollection = db.collection('users');

    // Verify sender exists and has the items
    const sender = await usersCollection.findOne({ robloxId: senderIdStr });
    if (!sender) {
      console.log('Sender not found:', senderIdStr);
      return res.status(404).json({ error: 'Sender not found' });
    }
    console.log('Sender found:', sender.username);

    // Verify recipient exists
    const recipient = await usersCollection.findOne({ robloxId: recipientIdStr });
    if (!recipient) {
      console.log('Recipient not found:', recipientIdStr);
      return res.status(404).json({ error: 'Recipient not found' });
    }
    console.log('Recipient found:', recipient.username);

    // Get sender's inventory
    const senderInventory = await inventoriesCollection.findOne({ 
      robloxId: senderIdStr
    });

    if (!senderInventory) {
      console.log('Sender inventory not found:', senderIdStr);
      return res.status(404).json({ error: 'Sender inventory not found' });
    }
    console.log('Sender inventory found with', 
      senderInventory.ps99Items ? senderInventory.ps99Items.length : 0, 
      'PS99 items');

    // Validate that sender has all items being tipped
    const itemsToTip = [];
    const instanceIds = items.map(item => String(item.instanceId));
    
    console.log('Items to check in inventory:', instanceIds);
    
    // For PS99 items
    if (senderInventory.ps99Items && Array.isArray(senderInventory.ps99Items)) {
      // Log sender's item IDs for debugging
      const senderItemIds = senderInventory.ps99Items.map(item => 
        item && item.instanceId ? String(item.instanceId) : 'null'
      );
      console.log('Sender inventory item IDs:', senderItemIds);
      
      // Normalize instanceIds in inventory for comparison
      const normalizedInventoryItems = senderInventory.ps99Items.map(item => {
        if (item && item.instanceId) {
          return {
            ...item,
            instanceId: String(item.instanceId)
          };
        }
        return item;
      });
      
      // Find items in inventory that match requested instanceIds
      const ps99Items = normalizedInventoryItems.filter(item => 
        item && item.instanceId && instanceIds.includes(item.instanceId)
      );
      
      console.log('Found matching items:', ps99Items.length, 'out of', items.length, 'requested');
      
      if (ps99Items.length !== items.length) {
        // Identify which items are missing
        const foundIds = ps99Items.map(item => item.instanceId);
        const missingIds = instanceIds.filter(id => !foundIds.includes(id));
        console.log('Missing item IDs:', missingIds);
        
        return res.status(400).json({ 
          error: 'Some items are not available in sender inventory',
          missingIds
        });
      }
      
      itemsToTip.push(...ps99Items);
    } else {
      console.log('Sender has no PS99 items or invalid items array');
      return res.status(400).json({ error: 'Sender has no items to tip' });
    }

    // Start a session for transaction
    const session = client.startSession();
    let transactionResult = null;

    try {
      console.log('Starting MongoDB transaction');
      
      // Transaction to move items between users
      transactionResult = await session.withTransaction(async () => {
        console.log('Transaction started');
        
        // 1. Remove items from sender with a single bulk operation
        const pullResult = await inventoriesCollection.updateOne(
          { robloxId: senderIdStr },
          { 
            $pull: { 
              ps99Items: { instanceId: { $in: instanceIds } } 
            } 
          },
          { session }
        );
        console.log('Pull result:', pullResult);

        if (!pullResult.acknowledged) {
          console.error('Pull operation failed');
          throw new Error('Failed to remove items from sender');
        }

        if (pullResult.modifiedCount === 0) {
          console.error('No items were removed from sender');
          throw new Error('Failed to remove items from sender inventory');
        }

        // 2. Add all items to recipient in one operation (more efficient than one-by-one)
        try {
          // Ensure recipient inventory exists
          const recipientInventory = await inventoriesCollection.findOne(
            { robloxId: recipientIdStr }, 
            { projection: { _id: 1 } }
          );
          
          if (!recipientInventory) {
            console.log('Creating recipient inventory');
            await inventoriesCollection.insertOne({
              robloxId: recipientIdStr,
              username: recipient.username,
              displayName: recipient.displayName,
              ps99Items: [],
              updatedAt: new Date()
            }, { session });
          }
          
          // Add all items at once with $push and $each
          const itemsWithTipDate = itemsToTip.map(item => ({
            ...item,
            tipDate: new Date()
          }));
          
          const pushResult = await inventoriesCollection.updateOne(
            { robloxId: recipientIdStr },
            { 
              $push: { 
                ps99Items: { 
                  $each: itemsWithTipDate 
                } 
              } 
            },
            { session }
          );
          
          console.log('Push result for all items:', pushResult);
          
          if (!pushResult.acknowledged) {
            console.error('Push operation failed');
            throw new Error('Failed to add items to recipient');
          }
        } catch (itemTransferError) {
          console.error('Error transferring items to recipient:', itemTransferError);
          throw itemTransferError;
        }

        // 3. Record the transaction
        try {
          const transactionRecord = await db.collection('transactions').insertOne({
            type: 'tip',
            senderId: senderIdStr,
            recipientId: recipientIdStr,
            items: itemsToTip,
            totalValue: itemsToTip.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0),
            timestamp: new Date()
          }, { session });
          console.log('Transaction record created:', transactionRecord);
          
          if (!transactionRecord.acknowledged) {
            console.error('Transaction record creation failed');
            throw new Error('Failed to record transaction');
          }
        } catch (recordError) {
          console.error('Error recording transaction:', recordError);
          throw recordError;
        }
        
        console.log('All transaction operations completed successfully');
        return true;
      }, {
        // Set shorter timeout for faster performance
        maxCommitTimeMS: 5000,
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' }
      });

      console.log('Transaction result:', transactionResult ? 'success' : 'failed');
    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    } finally {
      await session.endSession();
      console.log('Transaction session ended');
    }

    if (transactionResult) {
      const totalValue = itemsToTip.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
      console.log('Tip successful. Items:', itemsToTip.length, 'Value:', totalValue);
      
      // Create a notification for the recipient (outside the transaction to avoid affecting tipping)
      try {
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.insertOne({
          userId: recipientIdStr,
          type: 'tip',
          message: `You received ${itemsToTip.length} items worth R$${totalValue.toLocaleString()} from ${sender.username}`,
          senderName: sender.username,
          itemCount: itemsToTip.length,
          totalValue: totalValue,
          items: itemsToTip.map(item => ({
            name: item.name,
            value: item.value,
            image: item.image
          })),
          read: false,
          createdAt: new Date()
        });
        console.log('Notification created for recipient');
      } catch (notifyError) {
        // Just log the error but don't fail the tip if notification creation fails
        console.error('Failed to create notification:', notifyError);
      }
      
      return res.json({ 
        success: true,
        message: 'Tip successful',
        itemCount: itemsToTip.length,
        totalValue
      });
    } else {
      console.log('Transaction failed without specific error');
      return res.status(500).json({ error: 'Transaction failed' });
    }
    
  } catch (error) {
    console.error('Error processing tip:', error.message);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Error processing tip', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

module.exports = router; 