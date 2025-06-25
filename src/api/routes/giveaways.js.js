const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { auth } = require('../../middleware/auth');
const User = require('../../models/User');
const Giveaway = require('../../models/Giveaway');
const { getBankById } = require('../helpers/bankHelpers');
const { MongoClient } = require('mongodb');

// Create a new giveaway
router.post('/create', auth, async (req, res) => {
  try {
    const { items, endTimeString, numWinners } = req.body;
    const userId = req.user.id;

    console.log('Creating giveaway with user ID:', userId);
    console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(userId));
    console.log('Items type received:', typeof items);
    
    if (typeof items === 'string') {
      console.log('Items string length:', items.length);
      console.log('Items string preview:', items.substring(0, 200));
    } else if (Array.isArray(items)) {
      console.log('Items array length:', items.length);
      if (items.length > 0) {
        console.log('First item sample:', JSON.stringify(items[0]));
      }
    }

    // Parse items if they're sent as a string
    let parsedItems;
    if (!items) {
      return res.status(400).json({ error: 'Please select at least one item' });
    } else if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
        console.log('Successfully parsed items string into array of length:', parsedItems.length);
      } catch (err) {
        console.error('Failed to parse items string:', err);
        return res.status(400).json({ error: 'Invalid items format: ' + err.message });
      }
    } else {
      parsedItems = items;
    }

    // Validate items is an array
    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({ error: 'Please select at least one item' });
    }
    
    // Validate each item has required fields
    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];
      if (!item.instanceId) {
        console.error(`Item at index ${i} is missing instanceId:`, item);
        return res.status(400).json({ error: `Item at index ${i} is missing required instanceId field` });
      }
    }

    if (!endTimeString) {
      return res.status(400).json({ error: 'Please provide a valid end time' });
    }

    if (!numWinners || numWinners < 1) {
      return res.status(400).json({ error: 'Invalid number of winners' });
    }

    if (parsedItems.length % numWinners !== 0) {
      return res.status(400).json({ 
        error: 'Number of items must be evenly divisible by number of winners' 
      });
    }

    // Parse the end time string (could use a library like moment.js for more complex parsing)
    let endTime;
    try {
      // Handle relative time formats like "in 2 hours" or "in 30 minutes"
      const timeString = endTimeString.trim().toLowerCase();
      console.log('Parsing time string:', timeString);
      
      // Enhanced regex to capture more time formats
      // Match various time formats with improved pattern recognition
      if (/(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)/i.test(timeString)) {
        const now = new Date();
        let amount = 0;
        let unit = '';
        
        // Try different time formats with more inclusive pattern matching
        let match;
        
        // Format: "in X seconds/minutes/hours/days"
        if (match = timeString.match(/in\s+(\d+)\s+(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)/i)) {
          amount = parseInt(match[1], 10);
          unit = match[2].toLowerCase();
        } 
        // Format: "X seconds/minutes/hours/days"
        else if (match = timeString.match(/(\d+)\s+(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)/i)) {
          amount = parseInt(match[1], 10);
          unit = match[2].toLowerCase();
        }
        // Format: Xs, Xm, Xh, Xd (short forms)
        else if (match = timeString.match(/(\d+)(s|m|h|d)/i)) {
          amount = parseInt(match[1], 10);
          unit = match[2].toLowerCase();
        }
        
        console.log(`Matched time: ${amount} ${unit}`);
        
        if (amount > 0) {
          // Handle seconds (s, sec, secs, second, seconds)
          if (unit.startsWith('s')) {
            // Enforce minimum of 10 seconds
            amount = Math.max(amount, 10);
            // Enforce maximum of 1 day (86400 seconds)
            amount = Math.min(amount, 86400);
            
            // Calculate exact end time with millisecond precision
            endTime = new Date(now.getTime() + amount * 1000);
            
            console.log(`Setting end time to exactly ${amount} seconds from now:`, endTime);
            console.log(`Current time: ${now.toISOString()}, End time: ${endTime.toISOString()}`);
            console.log(`Time difference: ${(endTime - now) / 1000} seconds`);
          } 
          // Handle minutes (m, min, mins, minute, minutes)
          else if (unit.startsWith('m')) {
            // Enforce maximum of 1 day (1440 minutes)
            amount = Math.min(amount, 1440);
            
            // Calculate exact end time with millisecond precision
            endTime = new Date(now.getTime() + amount * 60 * 1000);
            
            console.log(`Setting end time to exactly ${amount} minutes from now:`, endTime);
            console.log(`Current time: ${now.toISOString()}, End time: ${endTime.toISOString()}`);
            console.log(`Time difference: ${(endTime - now) / (60 * 1000)} minutes`);
          } 
          // Handle hours (h, hr, hrs, hour, hours)
          else if (unit.startsWith('h')) {
            // Enforce maximum of 1 day (24 hours)
            amount = Math.min(amount, 24);
            
            // Calculate exact end time with millisecond precision
            endTime = new Date(now.getTime() + amount * 60 * 60 * 1000);
            
            console.log(`Setting end time to exactly ${amount} hours from now:`, endTime);
            console.log(`Current time: ${now.toISOString()}, End time: ${endTime.toISOString()}`);
            console.log(`Time difference: ${(endTime - now) / (60 * 60 * 1000)} hours`);
          } 
          // Handle days (d, day, days)
          else if (unit.startsWith('d')) {
            // Enforce maximum of 1 day
            amount = Math.min(amount, 1);
            
            // Calculate exact end time with millisecond precision
            endTime = new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
            
            console.log(`Setting end time to exactly ${amount} days from now:`, endTime);
            console.log(`Current time: ${now.toISOString()}, End time: ${endTime.toISOString()}`);
            console.log(`Time difference: ${(endTime - now) / (24 * 60 * 60 * 1000)} days`);
          }
          
          console.log(`Parsed relative time: ${amount} ${unit} -> ${endTime}`);
        } else {
          console.error('Failed to parse amount from:', timeString);
          return res.status(400).json({ 
            error: 'Invalid time format. Try "in X seconds", "in X minutes", "in X hours", or "in X days"' 
          });
        }
      } else {
        // Try direct date parsing for ISO format or other standard formats
        endTime = new Date(timeString);
      }
      
      // Validate that we have a valid date
      if (!endTime || isNaN(endTime.getTime())) {
        console.error('Invalid date parsed:', endTime);
        return res.status(400).json({ 
          error: 'Invalid time format. Please use "in X seconds", "in X minutes", "in X hours", or "in X days"'
        });
      }
      
      // If it's in the past, return an error
      if (endTime <= new Date()) {
        return res.status(400).json({ error: 'End time must be in the future' });
      }
      
      console.log('Successfully parsed end time:', endTime);
    } catch (err) {
      console.error('Error parsing date:', err);
      return res.status(400).json({ error: 'Invalid time format. Please check your input.' });
    }

    // Get the user to verify they own the items and to get their username
    let user;
    try {
      // Try to find by robloxId instead of _id since the ID appears to be a Roblox ID
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.log('Using robloxId lookup instead of ObjectId for:', userId);
        user = await User.findOne({ robloxId: userId });
      } else {
        user = await User.findById(userId);
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    } catch (userError) {
      console.error('Error finding user:', userError);
      return res.status(500).json({ error: 'Error finding user' });
    }

    const userBank = await getBankById(userId);
    if (!userBank || !userBank.ps99Items) {
      return res.status(404).json({ error: 'User inventory not found' });
    }

    // Verify all items exist in the user's inventory
    const userItems = userBank.ps99Items;
    const itemInstanceIds = parsedItems.map(item => item.instanceId);
    
    // Check if every item from the request exists in user's inventory
    const hasAllItems = itemInstanceIds.every(instanceId => 
      userItems.some(item => item.instanceId === instanceId)
    );

    if (!hasAllItems) {
      return res.status(400).json({ error: 'You do not own one or more of the selected items' });
    }

    // Calculate total value of items
    const totalValue = parsedItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);

    // Use the MongoDB _id from the user document instead of the Roblox ID
    const mongoUserId = user._id;
    console.log('Using MongoDB _id for giveaway creation:', mongoUserId);

    // Create the giveaway
    const giveaway = new Giveaway({
      creatorId: mongoUserId,
      creatorUsername: user.username,
      items: parsedItems,
      totalValue,
      numWinners,
      itemsPerWinner: parsedItems.length / numWinners,
      endTime,
      participants: [{
        userId: mongoUserId,
        robloxId: user.robloxId || userId,
        username: user.username
      }],
      participantCount: 1 // Initialize with 1 participant (the creator)
    });

    const newGiveaway = await giveaway.save();
    
    // Emit updated giveaway count
    if (global.io && typeof global.emitActiveGiveawayCount === 'function') {
      global.emitActiveGiveawayCount();
    }
    
    // Remove the items from the user's inventory
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db();
    const inventoriesCollection = db.collection('inventories');

    // Get the user's robloxId - this should match the inventory collection
    const robloxIdForRemoval = user.robloxId || userId;
    console.log(`Removing items from inventory with robloxId: ${robloxIdForRemoval}`);

    // Remove the specified items from the user's inventory
    const removalResult = await inventoriesCollection.updateOne(
      { robloxId: String(robloxIdForRemoval) },
      { $pull: { ps99Items: { instanceId: { $in: parsedItems.map(item => item.instanceId) } } } }
    );
    
    console.log(`Removal result: ${JSON.stringify(removalResult)}`);
    await client.close();

    return res.status(201).json({ 
      message: 'Giveaway created successfully',
      giveaway: newGiveaway
    });
  } catch (err) {
    console.error('Error creating giveaway:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all active giveaways
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all giveaways and sort by creation date (newest first)
    let giveaways = await Giveaway.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Add a "joined" property to each giveaway based on the user's participation
    giveaways = giveaways.map(giveaway => {
      const giveawayObj = giveaway.toObject();
      
      // Set joined property based on participation
      giveawayObj.joined = giveaway.participants.some(p => 
        (p.userId && p.userId.toString() === userId.toString()) ||
        (p.robloxId && p.robloxId.toString() === userId.toString())
      );
      
      // Ensure participant count is accurate
      giveawayObj.participantCount = giveaway.participantCount || giveaway.participants.length;
      
      return giveawayObj;
    });
    
    return res.json({ giveaways });
  } catch (err) {
    console.error('Error fetching giveaways:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get giveaway by ID
router.get('/:id', async (req, res) => {
  try {
    // Validate ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid giveaway ID format' });
    }
    
    const giveaway = await Giveaway.findById(req.params.id);
    if (!giveaway) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }
    
    return res.json({ giveaway });
  } catch (err) {
    console.error('Error fetching giveaway:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a giveaway
router.post('/:id/join', auth, async (req, res) => {
  try {
    const giveawayId = req.params.id;
    const userId = req.user.id;
    
    // Validate ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(giveawayId)) {
      return res.status(400).json({ error: 'Invalid giveaway ID format' });
    }

    // Find user in database based on robloxId or _id
    let user;
    // Try to find by robloxId if userId is not a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Using robloxId lookup instead of ObjectId for:', userId);
      user = await User.findOne({ robloxId: userId });
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      console.log('User not found with ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check user's wager
    const UserStats = mongoose.model('UserStats');
    const userStats = await UserStats.findOne({ userId: user.robloxId || userId });
    
    if (!userStats || userStats.totalWager < 400000000) {
      return res.status(403).json({ 
        error: 'You need at least 400M wager to join giveaways',
        insufficientWager: true,
        currentWager: userStats?.totalWager || 0
      });
    }

    const giveaway = await Giveaway.findById(giveawayId);
    if (!giveaway) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }

    // Check if giveaway has ended
    if (giveaway.endTime <= new Date() || giveaway.isCompleted) {
      return res.status(400).json({ error: 'This giveaway has ended' });
    }

    // Check if user is already a participant
    const mongoUserId = user._id;
    const isAlreadyJoined = giveaway.participants.some(p => 
      (p.userId && p.userId.toString() === mongoUserId.toString()) ||
      (p.robloxId && p.robloxId.toString() === userId.toString())
    );
    
    if (isAlreadyJoined) {
      return res.status(400).json({ error: 'You have already joined this giveaway' });
    }

    // Add user to participants with both MongoDB ID and Roblox ID for better matching
    giveaway.participants.push({
      userId: mongoUserId,
      robloxId: user.robloxId || userId,
      username: user.username || req.user.username
    });
    
    // Update participant count
    giveaway.participantCount = (giveaway.participantCount || 0) + 1;

    await giveaway.save();

    return res.json({ 
      message: 'Successfully joined giveaway',
      giveaway
    });
  } catch (err) {
    console.error('Error joining giveaway:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// End a giveaway (pick winners)
router.post('/:id/end', auth, async (req, res) => {
  try {
    const giveawayId = req.params.id;
    const userId = req.user.id;

    // Validate ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(giveawayId)) {
      return res.status(400).json({ error: 'Invalid giveaway ID format' });
    }

    // Find user by robloxId if needed
    let user;
    let mongoUserId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Finding user by robloxId for ending giveaway:', userId);
      user = await User.findOne({ robloxId: userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      mongoUserId = user._id;
      console.log('Found user, using MongoDB _id:', mongoUserId);
    } else {
      mongoUserId = userId;
    }

    const giveaway = await Giveaway.findById(giveawayId);
    if (!giveaway) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }

    // Check if user is the creator
    if (!giveaway.creatorId || !mongoUserId || giveaway.creatorId.toString() !== mongoUserId.toString()) {
      return res.status(403).json({ error: 'Only the creator can end this giveaway' });
    }

    // Check if giveaway is already completed
    if (giveaway.isCompleted) {
      return res.status(400).json({ error: 'This giveaway has already ended' });
    }

    // Select random winners
    const participants = giveaway.participants;
    const numWinners = Math.min(giveaway.numWinners, participants.length);
    
    if (numWinners === 0) {
      return res.status(400).json({ error: 'No participants to select as winners' });
    }

    // Log for debugging
    console.log('Selecting winners for giveaway:', giveawayId);
    console.log('Total participants:', participants.length);
    console.log('Number of winners to select:', numWinners);

    // Shuffle participants
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    const selectedWinners = shuffled.slice(0, numWinners);

    // Log the selected winners
    console.log('Selected winners:', selectedWinners.map(w => ({ 
      userId: w.userId ? w.userId.toString() : 'undefined', 
      username: w.username 
    })));

    // Divide items among winners
    const itemsPerWinner = giveaway.items.length / numWinners;
    let remainingItems = [...giveaway.items];

    const winners = [];
    for (const winner of selectedWinners) {
      if (!winner.userId) {
        console.log('Warning: Winner has no userId', winner);
        continue;
      }

      // Randomly select items for this winner
      const winnerItems = [];
      for (let i = 0; i < itemsPerWinner; i++) {
        const randomIndex = Math.floor(Math.random() * remainingItems.length);
        const item = remainingItems.splice(randomIndex, 1)[0];
        
        // Convert the item to a plain object if it's a mongoose document
        const itemObject = item.toObject ? item.toObject() : {...item};
        winnerItems.push(itemObject);
      }

      winners.push({
        userId: winner.userId,
        username: winner.username,
        items: winnerItems
      });

      // Log winner info
      console.log(`Processing winner ${winner.username} (${winner.userId}) with ${winnerItems.length} items`);

      // Add items to winner's inventory
      try {
        const userIdString = winner.userId.toString();
        console.log(`Adding items to inventory for MongoDB user ID: ${userIdString}`);
        
        // Find the user by MongoDB ID to get their robloxId
        const winnerUser = await User.findById(userIdString);
        if (!winnerUser) {
          console.error(`Winner user not found in database: ${userIdString}`);
          continue;
        }
        
        const robloxId = winnerUser.robloxId;
        console.log(`Found winner's Roblox ID: ${robloxId}`);
        
        const winnerClient = await MongoClient.connect(process.env.MONGODB_URI);
        const winnerDb = winnerClient.db();
        const winnerInventoryCollection = winnerDb.collection('inventories');
        
        // Check if winner has an inventory, create one if not
        const winnerInventory = await winnerInventoryCollection.findOne({ robloxId: String(robloxId) });
        if (!winnerInventory) {
          console.log(`Creating new inventory for user ${winner.username} (Roblox ID: ${robloxId})`);
          await winnerInventoryCollection.insertOne({
            robloxId: String(robloxId),
            username: winner.username,
            ps99Items: []
          });
        }
        
        // Prepare items for insertion
        const itemsToAdd = winnerItems.map(item => {
          // Ensure all necessary fields are included
          return {
            instanceId: new ObjectId().toString(), // Generate new instanceId for each item
            name: item.name || 'Unknown Item',
            value: item.value || 0,
            image: item.image || '',
            game: item.game || 'ps99',
            type: item.type || 'pet',
            quantity: item.quantity || 1,
            addedAt: new Date()
          };
        });
        
        // Add items to winner's inventory
        const updateResult = await winnerInventoryCollection.updateOne(
          { robloxId: String(robloxId) },
          { $push: { ps99Items: { $each: itemsToAdd } } }
        );
        
        console.log(`Update result: ${JSON.stringify(updateResult)}`);
        await winnerClient.close();
      } catch (itemError) {
        console.error(`Error adding items to winner ${winner.username}:`, itemError);
        // Continue with next winner even if there's an error
      }
    }

    // Update giveaway with winners and mark as completed
    giveaway.winners = winners;
    giveaway.isCompleted = true;
    await giveaway.save();

    // Emit updated giveaway count
    if (global.io && typeof global.emitActiveGiveawayCount === 'function') {
      global.emitActiveGiveawayCount();
    }

    return res.json({
      message: 'Giveaway ended successfully',
      winners
    });
  } catch (err) {
    console.error('Error ending giveaway:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's active giveaways (created by them)
router.get('/user/created', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Finding giveaways created by user: ${userId}`);
    
    // First find the user by robloxId if needed
    let user;
    let mongoUserId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Finding user by robloxId:', userId);
      user = await User.findOne({ robloxId: userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      mongoUserId = user._id;
      console.log('Found user, using MongoDB _id:', mongoUserId);
    } else {
      mongoUserId = userId;
    }
    
    const giveaways = await Giveaway.find({ creatorId: mongoUserId }).sort({ createdAt: -1 });
    console.log(`Found ${giveaways.length} giveaways created by user ${userId}`);
    
    return res.json({ giveaways });
  } catch (err) {
    console.error('Error fetching user giveaways:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get giveaways user has joined
router.get('/user/joined', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Finding giveaways joined by user: ${userId}`);
    
    // First find the user by robloxId if needed
    let user;
    let mongoUserId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Finding user by robloxId:', userId);
      user = await User.findOne({ robloxId: userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      mongoUserId = user._id;
      console.log('Found user, using MongoDB _id:', mongoUserId);
    } else {
      mongoUserId = userId;
    }
    
    const giveaways = await Giveaway.find({ 'participants.userId': mongoUserId }).sort({ createdAt: -1 });
    console.log(`Found ${giveaways.length} giveaways joined by user ${userId}`);
    
    return res.json({ giveaways });
  } catch (err) {
    console.error('Error fetching joined giveaways:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active giveaway count
router.get('/active-count', async (req, res) => {
  try {
    const now = new Date();
    const count = await Giveaway.countDocuments({
      endTime: { $gt: now },
      isCompleted: false
    });
    
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting active giveaway count:', error);
    return res.status(500).json({ error: 'Failed to get active giveaway count' });
  }
});

// Debug endpoint to validate items format
router.post('/validate-items', auth, async (req, res) => {
  try {
    const { items } = req.body;
    console.log('Validating items format:', typeof items);
    
    // Parse items if they're sent as a string
    let parsedItems;
    if (!items) {
      return res.status(400).json({ 
        valid: false, 
        error: 'No items provided',
        received: items
      });
    } else if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
        console.log('Successfully parsed items string');
      } catch (err) {
        console.error('Failed to parse items string:', err);
        return res.status(400).json({ 
          valid: false, 
          error: 'Invalid JSON format',
          received: items.substring(0, 200) + '...'
        });
      }
    } else {
      parsedItems = items;
    }

    // Validate items is an array
    if (!Array.isArray(parsedItems)) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Items must be an array',
        received: typeof parsedItems,
        value: JSON.stringify(parsedItems).substring(0, 200) + '...'
      });
    }

    if (parsedItems.length === 0) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Items array is empty'
      });
    }

    // Check each item has the required fields
    const invalidItems = parsedItems.filter(item => !item.instanceId);
    if (invalidItems.length > 0) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Some items are missing required instanceId field',
        invalidItems: invalidItems.slice(0, 3)
      });
    }

    return res.json({ 
      valid: true, 
      itemCount: parsedItems.length,
      sampleItem: parsedItems[0]
    });
  } catch (err) {
    console.error('Error validating items:', err);
    return res.status(500).json({ 
      valid: false, 
      error: 'Internal server error',
      message: err.message
    });
  }
});

// Get count of active giveaways
router.get('/count', async (req, res) => {
  try {
    const count = await Giveaway.countDocuments({ 
      isCompleted: false,
      endTime: { $gt: new Date() }
    });
    
    return res.json({ count });
  } catch (err) {
    console.error('Error fetching giveaway count:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active giveaways
router.get('/active', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find active giveaways
    let giveaways = await Giveaway.find({ 
      isCompleted: false,
      endTime: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    // Add a "joined" property to each giveaway
    giveaways = giveaways.map(giveaway => {
      const giveawayObj = giveaway.toObject();
      
      // Set joined property based on participation
      giveawayObj.joined = giveaway.participants.some(p => 
        (p.userId && p.userId.toString() === userId.toString()) ||
        (p.robloxId && p.robloxId.toString() === userId.toString())
      );
      
      // Ensure participant count is accurate
      giveawayObj.participantCount = giveaway.participantCount || giveaway.participants.length;
      
      return giveawayObj;
    });
    
    return res.json({ giveaways });
  } catch (err) {
    console.error('Error fetching active giveaways:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all giveaways (both active and completed)
router.get('/all', async (req, res) => {
  try {
    const giveaways = await Giveaway.find()
      .sort({ createdAt: -1 })
      .limit(50); // Limit to 50 most recent giveaways
    
    return res.json({ giveaways });
  } catch (err) {
    console.error('Error fetching all giveaways:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Completely rewritten auto-end function to be more reliable
const autoEndExpiredGiveaways = async () => {
  try {
    const now = new Date();
    
    // Find all expired but not completed giveaways
    const expiredGiveaways = await Giveaway.find({
      isCompleted: false,
      endTime: { $lte: now }
    });
    
    console.log(`Found ${expiredGiveaways.length} expired giveaways to auto-end`);
    
    for (const giveaway of expiredGiveaways) {
      try {
        // Skip if no participants
        if (!giveaway.participants || giveaway.participants.length === 0) {
          console.log(`Giveaway ${giveaway._id} has no participants, marking as completed without winners`);
          giveaway.isCompleted = true;
          await giveaway.save();
          
          // Emit giveaway ended event
          if (global.io) {
            global.io.emit('giveaway_ended', {
              _id: giveaway._id,
              isCompleted: true,
              winners: []
            });
          }
          continue;
        }
        
        // Select random winners
        const participants = giveaway.participants;
        const numWinners = Math.min(giveaway.numWinners, participants.length);
        
        console.log(`Auto-ending giveaway ${giveaway._id} with ${participants.length} participants and ${numWinners} winners`);
        
        // Shuffle participants for fair selection
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const selectedWinners = shuffled.slice(0, numWinners);
        console.log(`Selected ${selectedWinners.length} winners`);
        
        // Divide items among winners
        const itemsPerWinner = Math.floor(giveaway.items.length / numWinners);
        const remainingItems = [...giveaway.items];
        
        const winners = [];
        
        for (let i = 0; i < selectedWinners.length; i++) {
          const winner = selectedWinners[i];
          
          if (!winner.userId) {
            console.log('Warning: Winner has no userId', winner);
            continue;
          }
          
          // Calculate items for this winner
          const startIdx = i * itemsPerWinner;
          const extraItem = i < (giveaway.items.length % numWinners) ? 1 : 0;
          const itemCount = itemsPerWinner + extraItem;
          
          // Get items for this winner
          const winnerItems = remainingItems.splice(0, itemCount);
          
          if (winnerItems.length === 0) {
            console.log(`No items left for winner ${winner.username}`);
            continue;
          }
          
          winners.push({
            userId: winner.userId,
            username: winner.username,
            robloxId: winner.robloxId,
            items: winnerItems
          });
          
          // Add items to winner's inventory
          try {
            // Get user from database to ensure we have the correct robloxId
            const winnerUser = await User.findById(winner.userId);
            
            if (!winnerUser) {
              console.error(`Winner user not found: ${winner.userId}`);
              continue;
            }
            
            const robloxId = winnerUser.robloxId || winner.robloxId;
            
            if (!robloxId) {
              console.error(`No robloxId found for winner: ${winner.username}`);
              continue;
            }
            
            console.log(`Adding items to inventory for user: ${winner.username} (Roblox ID: ${robloxId})`);
            
            // Connect to MongoDB directly
            const client = await MongoClient.connect(process.env.MONGODB_URI);
            const db = client.db();
            const inventoryCollection = db.collection('inventories');
            
            // Check if inventory exists, create if not
            const inventory = await inventoryCollection.findOne({ robloxId: String(robloxId) });
            
            if (!inventory) {
              console.log(`Creating new inventory for ${winner.username}`);
              await inventoryCollection.insertOne({
                robloxId: String(robloxId),
                username: winner.username,
                ps99Items: []
              });
            }
            
            // Process items for adding to inventory
            const itemsToAdd = winnerItems.map(item => ({
              instanceId: new ObjectId().toString(),
              name: item.name || 'Unknown Item',
              value: item.value || 0,
              image: item.image || '',
              game: item.game || 'ps99',
              type: item.type || 'pet',
              quantity: item.quantity || 1,
              addedAt: new Date()
            }));
            
            // Add items to inventory
            const updateResult = await inventoryCollection.updateOne(
              { robloxId: String(robloxId) },
              { $push: { ps99Items: { $each: itemsToAdd } } }
            );
            
            console.log(`Added ${itemsToAdd.length} items to ${winner.username}'s inventory:`, updateResult);
            
            await client.close();
          } catch (error) {
            console.error(`Failed to add items to winner ${winner.username}:`, error);
          }
        }
        
        // Mark giveaway as completed
        giveaway.isCompleted = true;
        giveaway.winners = winners;
        await giveaway.save();
        
        // Emit giveaway ended event
        if (global.io) {
          global.io.emit('giveaway_ended', giveaway);
          console.log(`Emitted giveaway_ended event for ${giveaway._id}`);
        }
        
        console.log(`Successfully ended giveaway ${giveaway._id} with ${winners.length} winners`);
      } catch (error) {
        console.error(`Error processing giveaway ${giveaway._id}:`, error);
      }
    }
    
    // Update active giveaway count if any were ended
    if (expiredGiveaways.length > 0 && global.io && typeof global.emitActiveGiveawayCount === 'function') {
      global.emitActiveGiveawayCount();
    }
  } catch (error) {
    console.error('Error in autoEndExpiredGiveaways:', error);
  }
};

// Run auto-end check more frequently (every minute) to ensure timely processing
setInterval(autoEndExpiredGiveaways, 60 * 1000);

// Run once at startup
autoEndExpiredGiveaways();

module.exports = router; 