const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const Coinflip = require('../models/Coinflip');
const UserStats = require('../models/UserStats');
const Stats = require('../models/Stats');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');
const axios = require('axios');
const { sendTaxNotification } = require('../../discord-bot');
const { calculateTax } = require('../utils/tax');
const { MongoClient } = require('mongodb');
const { validateCoinflipItems } = require('../middleware/coinflipValidation');

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Lock timeout in seconds
const LOCK_TIMEOUT = 30;

// Function to acquire a lock with retry
const acquireLock = async (key, timeout = LOCK_TIMEOUT) => {
  const lockId = uuidv4();
  let retries = 5;
  
  while (retries > 0) {
    const acquired = await redis.set(
      `lock:${key}`,
      lockId,
      'NX',
      'EX',
      timeout
    );
    
    if (acquired === 'OK') {
      return lockId;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    retries--;
  }
  
  return null;
};

// Function to release a lock
const releaseLock = async (key, lockId) => {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  
  await redis.eval(script, 1, `lock:${key}`, lockId);
};

// Function to get item version
const getItemVersion = async (itemId) => {
  const version = await redis.get(`item:${itemId}:version`);
  return version ? parseInt(version) : 0;
};

// Function to increment item version
const incrementItemVersion = async (itemId) => {
  return await redis.incr(`item:${itemId}:version`);
};

// Function to validate item versions
const validateItemVersions = async (items) => {
  for (const item of items) {
    const currentVersion = await getItemVersion(item.instanceId);
    if (currentVersion !== (item.version || 0)) {
      return false;
    }
  }
  return true;
};

// Cache for tracking games being joined
const joiningGames = new Map();

// Cache for tracking items being used in transactions
const itemsInUse = new Map();

// Function to check if items are currently in use
const areItemsInUse = (items) => {
  const itemIds = items.map(item => item.instanceId);
  return itemIds.some(id => itemsInUse.has(id));
};

// Function to mark items as in use
const markItemsInUse = async (items, userId) => {
  const lockPromises = items.map(async (item) => {
    const lockId = await acquireLock(`item:${item.instanceId}`);
    if (!lockId) {
      throw new Error(`Could not acquire lock for item ${item.instanceId}`);
    }
    
    itemsInUse.set(item.instanceId, {
      userId,
      lockId,
      version: await incrementItemVersion(item.instanceId)
    });
  });
  
  await Promise.all(lockPromises);
};

// Function to release items
const releaseItems = async (items) => {
  const releasePromises = items.map(async (item) => {
    const itemData = itemsInUse.get(item.instanceId);
    if (itemData && itemData.lockId) {
      await releaseLock(`item:${item.instanceId}`, itemData.lockId);
    }
    itemsInUse.delete(item.instanceId);
  });
  
  await Promise.all(releasePromises);
};

// Add transaction logging
const logTransaction = async (session, {
  type,
  userId,
  gameId,
  items,
  status,
  details
}) => {
  const TransactionLog = mongoose.model('TransactionLog', {
    transactionId: String,
    type: String,
    userId: String,
    gameId: String,
    items: Array,
    status: String,
    details: Object,
    createdAt: Date,
    itemVersions: Object
  });

  const itemVersions = {};
  for (const item of items) {
    itemVersions[item.instanceId] = await getItemVersion(item.instanceId);
  }

  await TransactionLog.create([{
    transactionId: uuidv4(),
    type,
    userId,
    gameId,
    items,
    status,
    details,
    itemVersions,
    createdAt: new Date()
  }], { session });
};

// Clear joining status ONLY when explicitly needed, not with a timeout
const clearJoiningStatus = (gameId) => {
  if (joiningGames.has(gameId)) {
    console.log(`Clearing join status for game ${gameId}`);
    joiningGames.delete(gameId);
    
    // Notify all clients that the join state has been reset
    if (global.io) {
      global.io.emit('join_state_reset', { gameId });
    }
  }
};

// Constants for tax
const COINFLIP_TAX_RATE = 0.12; // 12% tax
const MAX_TAX_VALUE = 1000000000; // 1 billion max tax
const TAX_COLLECTOR_ID = "1241268037"; // matetsss's Roblox ID

// Function to handle tax collection
const addTaxedItemsToCollector = async (taxResult, session) => {
  if (!taxResult || !taxResult.taxedItems || taxResult.taxedItems.length === 0) {
    console.log("No tax items to add to collector");
    return;
  }
  
  try {
    const Inventory = mongoose.model('Inventory');
    
    console.log(`\n\x1b[33m%s\x1b[0m`, `========== ADDING TAX ITEMS TO COLLECTOR ==========`);
    console.log(`Found ${taxResult.taxedItems.length} tax items worth ${taxResult.totalTaxValue} to add`);
    
    // Check if tax collector's inventory exists
    const taxCollectorInventory = await Inventory.findOne(
      { robloxId: TAX_COLLECTOR_ID },
      null,
      { session }
    );
    
    // Create inventory if it doesn't exist
    if (!taxCollectorInventory) {
      console.log(`Creating new inventory for tax collector (ID: ${TAX_COLLECTOR_ID})`);
      await Inventory.create([{
        robloxId: TAX_COLLECTOR_ID,
        username: "matetsss",
        displayName: "matetsss",
        mm2Items: [],
        ps99Items: [],
        stats: {
          mm2: { itemCount: 0, totalValue: 0 },
          ps99: { itemCount: 0, totalValue: 0 },
          overall: { totalValue: 0 }
        },
        createdAt: new Date()
      }], { session });
    }
    
    // Prepare tax items with new instance IDs
    const taxItemsToAdd = taxResult.taxedItems.map(item => ({
      ...item,
      instanceId: new mongoose.Types.ObjectId().toString(),
      addedAt: new Date()
    }));
    
    // Log each item being added
    taxItemsToAdd.forEach(item => {
      console.log(`\x1b[32m%s\x1b[0m`, `➕ Adding: ${item.name} (${item.value})`);
    });
    
    // Add items to tax collector's inventory
    const result = await Inventory.findOneAndUpdate(
      { robloxId: TAX_COLLECTOR_ID },
      { 
        $push: { 
          ps99Items: { 
            $each: taxItemsToAdd
          }
        },
        $inc: {
          'stats.ps99.itemCount': taxItemsToAdd.length,
          'stats.ps99.totalValue': taxResult.totalTaxValue,
          'stats.overall.totalValue': taxResult.totalTaxValue
        }
      },
      { session, new: true }
    );
    
    if (!result) {
      throw new Error("Failed to update tax collector's inventory");
    }
    
    // Verify the update was successful
    const updatedInventory = await Inventory.findOne(
      { robloxId: TAX_COLLECTOR_ID },
      null,
      { session }
    );
    
    console.log(`\x1b[32m%s\x1b[0m`, `✅ SUCCESS: Added ${taxResult.taxedItems.length} tax items worth ${taxResult.totalTaxValue} to tax collector's inventory`);
    console.log(`Tax collector now has ${updatedInventory.ps99Items.length} PS99 items worth ${updatedInventory.stats.ps99.totalValue}`);
    console.log(`\x1b[33m%s\x1b[0m`, `====================================================\n`);
    
    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `❌ ERROR: Failed to add tax items to collector: ${error.message}`);
    console.error(error);
    return false;
  }
};

// Function to handle coinflip tax
const handleCoinflipTax = async (game, items, session) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { taxedItems: [], totalTaxValue: 0 };
  }
  
  // Calculate total pot value
  const totalPotValue = (game.creatorItems || []).reduce((sum, item) => sum + item.value, 0) +
                       (game.joinerItems || []).reduce((sum, item) => sum + item.value, 0);
  
  // Use flat 12% tax rate - never exceed this
  const taxRate = COINFLIP_TAX_RATE; // 12%
  
  // Make a copy of the items array
  const itemsToSort = [...items];
  
  // Sort items by value (SMALLEST first) - this is the key change
  const sortedItems = itemsToSort.sort((a, b) => {
    // Make sure values are treated as numbers
    const aValue = Number(a.value);
    const bValue = Number(b.value);
    
    // Compare by value (smallest first)
    return aValue - bValue;
  });
  
  console.log("\n\x1b[33m%s\x1b[0m", "========== SORTED ITEMS BY VALUE (SMALLEST FIRST) ==========");
  sortedItems.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name}: ${item.value}`);
  });
  
  const taxedItems = [];
  let totalTaxValue = 0;
  
  // Calculate target tax amount
  const targetTaxAmount = totalPotValue * taxRate;
  console.log(`\nTotal pot value: ${totalPotValue}`);
  console.log(`Target tax amount (${taxRate * 100}%): ${targetTaxAmount}`);
  
  // Take items starting from smallest until we reach the target
  for (const item of sortedItems) {
    // Add this item to tax temporarily
    taxedItems.push(item);
    totalTaxValue += item.value;
    console.log(`\x1b[36m%s\x1b[0m`, `+ Adding ${item.name} (${item.value}) as tax, total now: ${totalTaxValue}`);
    
    // If we've exceeded the target amount, check if removing the last item would be better
    if (totalTaxValue > targetTaxAmount) {
      // If removing the last item would put us closer to (but still below) the target amount
      if (totalTaxValue - item.value > 0) {
        console.log(`\x1b[33m%s\x1b[0m`, `Removing ${item.name} (${item.value}) - exceeded target`);
        taxedItems.pop();
        totalTaxValue -= item.value;
      }
      break;
    }
  }
  
  // Final log of selected items
  console.log(`\n\x1b[31m%s\x1b[0m`, "========== FINAL TAX ITEMS ==========");
  taxedItems.forEach((item, index) => {
    console.log(`\x1b[31m%s\x1b[0m`, `${index + 1}. ${item.name} (${item.value})`);
  });
  
  console.log(`\nFinal tax amount: ${totalTaxValue} / ${targetTaxAmount} (${(totalTaxValue/targetTaxAmount*100).toFixed(2)}% of target)`);
  console.log(`Actual tax percentage: ${(totalTaxValue/totalPotValue*100).toFixed(2)}% of pot value`);
  console.log(`\x1b[33m%s\x1b[0m`, "=====================================================\n");
  
  // Send webhook notification if needed
  try {
    if (taxedItems.length > 0) {
      const formatValue = (value) => {
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
        return value.toString();
      };
      
      // Get usernames for winner and loser
      const winnerUser = await User.findOne({ robloxId: game.winner });
      const loserUser = await User.findOne({ 
        robloxId: game.creator === game.winner ? game.joiner : game.creator
      });
      
      const winnerName = winnerUser ? winnerUser.displayName || winnerUser.username : game.winner;
      const loserName = loserUser ? loserUser.displayName || loserUser.username : 
                      (game.creator === game.winner ? game.joiner : game.creator);
      
      // Send webhook to Discord
      const taxWebhookUrl = 'https://discord.com/api/webhooks/1365385081371234315/IQHve8PJrWwycMOe4a9fhUXld-hrAwp-tlThEnkuAb1WAR_1sMqwucz2-203g3Ou5FZH';
      
      const embed = {
        title: '🪙 Coinflip Tax Collected',
        color: 0x2F3136, // Dark gray color
        fields: [
          {
            name: 'Game Type',
            value: (game.gameType || 'ps99').toUpperCase(),
            inline: true
          },
          {
            name: 'Winner',
            value: winnerName,
            inline: true
          },
          {
            name: 'Loser',
            value: loserName,
            inline: true
          },
          {
            name: 'Total Pot Value',
            value: formatValue(totalPotValue),
            inline: true
          },
          {
            name: 'Tax Collected',
            value: formatValue(totalTaxValue),
            inline: true
          },
          {
            name: 'Actual Tax Rate',
            value: `${(totalTaxValue/totalPotValue*100).toFixed(2)}%`,
            inline: true
          },
          {
            name: 'Taxed Items',
            value: taxedItems.map(item => `${item.name} (${formatValue(item.value)})`).join('\n').substring(0, 1024) || 'None',
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'BloxyCoins Tax System'
        }
      };
      
      axios.post(taxWebhookUrl, {
        embeds: [embed]
      }).catch(error => console.error('Discord webhook error:', error));
    }
  } catch (error) {
    console.error('Error sending tax webhook:', error);
  }
  
  return { taxedItems, totalTaxValue, taxPercentage: (totalTaxValue/totalPotValue*100) };
};

// Function to get Roblox avatar URL from users collection
const getRobloxAvatar = async (userId, session) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findOne({ robloxId: userId }).session(session);
    if (user && user.thumbnail) {
      return user.thumbnail;
    }
    console.error('No user or thumbnail found for userId:', userId);
    return null;
  } catch (error) { 
    console.error('Error fetching avatar from database:', error);
    return null;
  }
};

// Function to get user data from database
const getUserData = async (userId, session) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findOne({ robloxId: userId }).session(session);
    if (!user) {
      console.error('User not found:', userId);
      return null;
    }
    return {
      id: user.robloxId,
      username: user.username,
      displayName: user.displayName,
      avatar: user.thumbnail // Use thumbnail field from User model
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

// Check if game is being joined
router.post('/check-join', auth, async (req, res) => {
  const { gameId } = req.body;
  
  try {
    // Check if game exists and is joinable
    const game = await Coinflip.findById(gameId);
    if (!game) {
      return res.status(404).json({ 
        message: 'Game not found',
        status: 'not_found'
      });
    }

    if (game.state !== 'active') {
      return res.status(400).json({ 
        message: 'Game is not available for joining',
        status: 'unavailable'
      });
    }

    if (game.joiner) {
      return res.status(400).json({ 
        message: 'Game already has a joiner',
        status: 'has_joiner'
      });
    }

    // Check if someone is in process of joining
    const isBeingJoined = joiningGames.has(gameId);
    const currentJoiner = isBeingJoined ? joiningGames.get(gameId) : null;
    
    res.json({ 
      isBeingJoined,
      currentJoiner,
      status: isBeingJoined ? 'being_joined' : 'joinable'
    });
  } catch (error) {
    console.error('Error checking join status:', error);
    res.status(500).json({ 
      message: 'Server error checking join status',
      status: 'error'
    });
  }
});

// Join a game
router.post('/join', auth, validateCoinflipItems, async (req, res) => {
  const { gameId, items } = req.body;
  const userId = req.user.id;
  let lockIds = [];
  
  try {
    // Acquire locks for all items
    for (const item of items) {
      const lockId = await acquireLock(`item:${item.instanceId}`);
      if (!lockId) {
        // Release any locks we've already acquired
        for (const releaseLockId of lockIds) {
          await releaseLock(releaseLockId);
        }
        return res.status(400).json({ message: 'Items are currently locked in another transaction' });
  }
      lockIds.push(lockId);
    }
    
    // Validate item versions
    if (!await validateItemVersions(items)) {
      throw new Error('Item versions have changed - possible duplicate attempt');
  }

  // Mark items as in use
    await markItemsInUse(items, userId);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Mark game as being joined
    joiningGames.set(gameId, userId);

    // Get game and validate with session
    const game = await Coinflip.findById(gameId).session(session);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.state !== 'active') {
      throw new Error('Game is not available for joining');
    }

    if (game.joiner) {
      throw new Error('Game already has a joiner');
    }

    if (game.creator === userId) {
      throw new Error('Cannot join your own game');
    }

    // Calculate total value of selected items
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    if (totalValue < game.joinRangeMin || totalValue > game.joinRangeMax) {
      throw new Error('Selected items value is outside the allowed range');
    }

    // Lock and verify inventory items with session
    const Inventory = mongoose.model('Inventory');
    const userInventory = await Inventory.findOne({ robloxId: userId })
      .session(session)
      .select('ps99Items');
    
    if (!userInventory) throw new Error('User inventory not found');

    // Verify all items exist and haven't been used
    const userItemIds = new Set(userInventory.ps99Items.map(item => item.instanceId));
    const missing = items.filter(item => !userItemIds.has(item.instanceId));
    if (missing.length > 0) {
      throw new Error('One or more selected items are no longer in your inventory');
    }

    // Remove items with atomic operation
    const removeResult = await Inventory.findOneAndUpdate(
      { 
        robloxId: userId,
        'ps99Items.instanceId': { $all: items.map(item => item.instanceId) }
      },
      {
        $pull: {
          ps99Items: {
            instanceId: { $in: items.map(item => item.instanceId) }
          }
        }
      },
      { session, new: true }
    );

    if (!removeResult) {
      throw new Error('Failed to remove items from inventory - items may have been used');
    }

    // Get joiner's complete data including avatar
    const joinerData = await getUserData(userId, session);
    if (!joinerData) {
      throw new Error('Could not fetch joiner data');
    }

    // Get creator's complete data if not already set
    if (!game.creatorData || !game.creatorAvatar) {
      const creatorData = await getUserData(game.creator, session);
      if (creatorData) {
        game.creatorData = creatorData;
        game.creatorAvatar = creatorData.avatar;
      }
    }

    // Generate game result using provably fair system
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const clientSeed = crypto.randomBytes(32).toString('hex');
    const combinedSeed = serverSeed + clientSeed;
    const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
    const normalizedResult = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
    const randomResult = normalizedResult < 0.5 ? 'heads' : 'tails';
    const winner = randomResult === game.creatorSide ? game.creator : userId;

    // Store complete item information
    const joinerItemsWithFullDetails = items.map(item => ({
      instanceId: item.instanceId,
      value: item.value,
      name: item.name,
      image: item.image,
      type: item.type,
      game: item.game || 'ps99',
      quantity: item.quantity || 1,
      addedAt: item.addedAt || new Date()
    }));

    // Update game with all required fields
    const gameUpdates = {
      joiner: userId,
      joinerData: joinerData,
      joinerAvatar: joinerData.avatar,
      joinerItems: joinerItemsWithFullDetails,
      state: 'ended',
      winner,
      winnerSide: randomResult,
      serverSeed,
      serverSeedHash,
      randomSeed: clientSeed,
      normalizedResult,
      endedAt: new Date()
    };

    // Apply all updates to game document
    Object.assign(game, gameUpdates);

    // Determine the winner
    const winnerItems = winner === game.creator ? game.creatorItems : joinerItemsWithFullDetails;
    const loserItems = winner === game.creator ? joinerItemsWithFullDetails : game.creatorItems;
    
    console.log(`\n\x1b[33m%s\x1b[0m`, `========== CALCULATING TAX FOR GAME ==========`);
    console.log(`Winner: ${winner} (${winner === game.creator ? 'Creator' : 'Joiner'})`);
    console.log(`Total pot value: ${game.value + totalValue}`);
    console.log(`Tax rate: ${COINFLIP_TAX_RATE * 100}% (exact or below - NEVER exceeding)`);
    console.log(`Tax target amount: ${(game.value + totalValue) * COINFLIP_TAX_RATE}`);
    
    // Combine all items from both players for tax consideration
    const allItems = [...winnerItems, ...loserItems];
    console.log(`Total number of items available for tax: ${allItems.length}`);
    
    console.log(`All items available for tax consideration:`);
    [...allItems].sort((a, b) => a.value - b.value).slice(0, 20).forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.value}`);
    });
    
    // Calculate tax from ALL items (both winner and loser)
    const taxResult = calculateTax(allItems);
    
    console.log(`Tax calculated: ${taxResult.taxedItems.length} items worth ${taxResult.totalTaxValue} (${taxResult.taxPercentage.toFixed(2)}%)`);
    console.log(`Items being taxed from game:`);
    taxResult.taxedItems.forEach(item => {
      console.log(`\x1b[31m%s\x1b[0m`, `🔴 TAXED: ${item.name} (${item.value})`);
    });
    console.log(`\x1b[33m%s\x1b[0m`, `===============================================\n`);
    
    // Store tax information in game document
    game.taxedItems = taxResult.taxedItems;
    game.totalTaxValue = taxResult.totalTaxValue;

    await game.save({ session });

    // Clear the joining state after successful join
    joiningGames.delete(gameId);

    // Add items to winner's inventory based on who won
    if (winner === game.creator) {
      // Creator won - add all non-taxed items to creator's inventory
      // Filter out taxed items from both sets of items
      const nonTaxedCreatorItems = game.creatorItems.filter(creatorItem => 
        !taxResult.taxedItems.some(taxedItem => 
          taxedItem.instanceId === creatorItem.instanceId
        )
      );
      
      const nonTaxedJoinerItems = joinerItemsWithFullDetails.filter(joinerItem => 
        !taxResult.taxedItems.some(taxedItem => 
          taxedItem.instanceId === joinerItem.instanceId
        )
      );
      
      await Inventory.findOneAndUpdate(
        { robloxId: game.creator },
        { 
          $push: { 
            ps99Items: { 
              $each: [...nonTaxedCreatorItems, ...nonTaxedJoinerItems]
            }
          }
        },
        { session, new: true }
      );
      
      // Add taxed items to tax collector's inventory (matetsss)
      await addTaxedItemsToCollector(taxResult, session);
    } else {
      // Joiner won - add all non-taxed items to joiner's inventory
      // Filter out taxed items from both sets of items
      const nonTaxedJoinerItems = joinerItemsWithFullDetails.filter(joinerItem => 
        !taxResult.taxedItems.some(taxedItem => 
          taxedItem.instanceId === joinerItem.instanceId
        )
      );
      
      const nonTaxedCreatorItems = game.creatorItems.filter(creatorItem => 
        !taxResult.taxedItems.some(taxedItem => 
          taxedItem.instanceId === creatorItem.instanceId
        )
      );
      
      await Inventory.findOneAndUpdate(
        { robloxId: userId },
        { 
          $push: { 
            ps99Items: { 
              $each: [...nonTaxedJoinerItems, ...nonTaxedCreatorItems]
            }
          }
        },
        { session, new: true }
      );
      
      // Add taxed items to tax collector's inventory (matetsss)
      await addTaxedItemsToCollector(taxResult, session);
    }

    await session.commitTransaction();
    
    // Release items and joining status only after successful commit
      await releaseItems(items);
    joiningGames.delete(gameId);

    // Send tax notification after transaction is committed
    await sendTaxNotification(game);

    // Update both users' stats
    const joinerStats = await UserStats.getOrCreate(userId);
    const creatorStats = await UserStats.getOrCreate(game.creator);

    // Update joiner stats
    joinerStats.totalWager += totalValue;
    joinerStats.totalGames += 1;
    
    if (winner === userId) {
      joinerStats.totalProfit += game.value; // Winner gets the total pot
      joinerStats.winStreak += 1;
    } else {
      joinerStats.totalProfit -= totalValue; // Loser loses their bet
      joinerStats.winStreak = 0;
    }

    // Update creator stats
    creatorStats.totalWager += game.value;
    creatorStats.totalGames += 1;
    
    if (winner === game.creator) {
      creatorStats.totalProfit += totalValue; // Winner gets the joiner's items value
      creatorStats.winStreak += 1;
    } else {
      creatorStats.totalProfit -= game.value; // Loser loses their bet
      creatorStats.winStreak = 0;
    }

    await joinerStats.save();
    await creatorStats.save();

    // Calculate the win amount based on who won
    const winAmount = winner === game.creator 
      ? totalValue // Creator won joiner's items
      : game.value; // Joiner won creator's items
    
    // The total pot amount (both sides combined)
    const totalPotAmount = game.value + totalValue;

    // Update biggest win if applicable
    await Stats.checkAndUpdateBiggestWin(totalPotAmount);
    
    // Add 15% of the tax to the tax pool for giveaways
    if (taxResult.totalTaxValue > 0) {
      const giveawayAmount = Math.floor(taxResult.totalTaxValue * 0.15); // 15% of tax goes to giveaway pool
      console.log(`\x1b[32m%s\x1b[0m`, `Adding ${giveawayAmount} (15% of ${taxResult.totalTaxValue}) to tax pool for giveaways`);
      
      // Update the tax pool in the database
      const statsBeforeUpdate = await Stats.findOne();
      console.log(`Tax pool before update: ${statsBeforeUpdate?.taxPool || 0}`);
      
      await Stats.updateTaxPool(giveawayAmount);
      
      // Verify the update was successful
      const statsAfterUpdate = await Stats.findOne();
      console.log(`Tax pool after update: ${statsAfterUpdate?.taxPool || 0}`);
      console.log(`Biggest win after update: ${statsAfterUpdate?.biggestWin || 0}`);
      
      // Force stats update after tax pool update - with triple verification
      if (global.io) {
        try {
          // If calculateCoinflipStats function is available, use it
          if (typeof calculateCoinflipStats === 'function') {
            console.log("Calculating updated stats to broadcast to clients...");
            const updatedStats = await calculateCoinflipStats();
            console.log("Broadcasting updated stats:", {
              totalGames: updatedStats.totalGames,
              totalValue: updatedStats.totalValue,
              biggestWin: updatedStats.biggestWin,
              taxCollected: updatedStats.taxCollected,
              raw: {
                biggestWin: statsAfterUpdate.biggestWin,
                taxPool: statsAfterUpdate.taxPool
              }
            });
            
            // Emit to all clients
            global.io.emit('coinflip_stats', updatedStats);
            
            // Force a second update after a short delay to ensure UI reflects changes
            setTimeout(async () => {
              const refreshedStats = await calculateCoinflipStats();
              global.io.emit('coinflip_stats', refreshedStats);
            }, 1000);
          } else {
            console.error("calculateCoinflipStats function not available - stats will not auto-update");
          }
        } catch (error) {
          console.error('Error updating stats after tax pool update:', error);
        }
      } else {
        console.error("global.io not available - stats will not auto-update");
      }
    }

    // Emit socket events for game joined/ended
    if (global.io) {
      const io = global.io;
      
      // First emit game_joined to update UI - broadcast to everyone
      io.emit('game_joined', {
        gameId: game._id,
        joinerAvatar: joinerData.avatar,
        joinerName: joinerData.username,
        joiner: userId,
        winner,
        winningSide: randomResult,
        value: game.value,
        totalValue: game.value + totalValue,
        creatorItems: game.creatorItems,
        joinerItems: joinerItemsWithFullDetails,
        creatorSide: game.creatorSide,
        creatorAvatar: game.creatorAvatar,
        creatorName: game.creatorData.username
      });
      
      // Also emit to specific game room for real-time updates to viewers
      io.to(`game-${game._id}`).emit('game_joined', {
        gameId: game._id,
        joinerAvatar: joinerData.avatar,
        joinerName: joinerData.username,
        joiner: userId,
        winner,
        winningSide: randomResult,
        value: game.value,
        totalValue: game.value + totalValue,
        creatorItems: game.creatorItems,
        joinerItems: joinerItemsWithFullDetails,
        creatorSide: game.creatorSide,
        creatorAvatar: game.creatorAvatar,
        creatorName: game.creatorData.username,
        state: 'ended',
        endedAt: new Date()
      });

      // Then emit game_ended after a short delay to ensure proper sequence
      setTimeout(() => {
        io.emit('game_ended', {
          gameId: game._id,
          winner,
          winningSide: randomResult
        });
      }, 100);
    }

      // Log successful transaction
      await logTransaction(session, {
        type: 'JOIN_GAME',
        userId,
        gameId,
        items,
        status: 'SUCCESS',
        details: {
          winner,
          totalValue,
          taxInfo: taxResult
        }
      });

    res.json({
      success: true,
      game,
      taxInfo: {
        taxedItems: taxResult.taxedItems,
        totalTaxValue: taxResult.totalTaxValue
      }
    });

  } catch (error) {
      // Log failed transaction
      await logTransaction(session, {
        type: 'JOIN_GAME',
        userId,
        gameId,
        items,
        status: 'FAILED',
        details: { error: error.message }
      });
      
      // Release all locks
      for (const lockId of lockIds) {
        await releaseLock(lockId);
      }
    
    // Release items and joining status on error
      await releaseItems(items);
    joiningGames.delete(gameId);
    
    console.error('Error in join game:', error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
    }

  } catch (error) {
    // Release all locks
    for (const lockId of lockIds) {
      await releaseLock(lockId);
    }
    
    console.error('Error in join game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific game by ID
router.get('/game/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // Validate the game ID
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }
    
    // Find the game
    const game = await Coinflip.findById(gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Server error fetching game' });
  }
});

// Add a new endpoint to get raw stats directly from database
router.get('/raw-stats', async (req, res) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    
    // Get the raw stats document directly from MongoDB
    const statsData = await db.collection('stats').findOne({});
    
    if (!statsData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stats not found' 
      });
    }
    
    console.log("Sending raw stats from database:", statsData);
    
    // Return the raw document with minimal processing
    res.json({
      success: true,
      rawStats: {
        biggestWin: statsData.biggestWin,
        taxPool: statsData.taxPool,
        createdAt: statsData.createdAt,
        updatedAt: statsData.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching raw stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  } finally {
    if (client) await client.close();
  }
});

// Add coinflip creation endpoint with inventory validation and locking
router.post('/create', auth, validateCoinflipItems, async (req, res) => {
  const { items, side } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid items' });
  }

  // Check if any of the items are already in use
  if (areItemsInUse(items)) {
    return res.status(400).json({ message: 'Some items are currently being used in another transaction' });
  }

  // Mark items as in use
  await markItemsInUse(items, userId);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Lock and verify inventory items with session
    const Inventory = mongoose.model('Inventory');
    const userInventory = await Inventory.findOne({ robloxId: userId })
      .session(session)
      .select('ps99Items');
    
    if (!userInventory) throw new Error('User inventory not found');

    // Verify all items exist and haven't been used
    const userItemIds = new Set(userInventory.ps99Items.map(item => item.instanceId));
    const missing = items.filter(item => !userItemIds.has(item.instanceId));
    if (missing.length > 0) {
      throw new Error('One or more selected items are no longer in your inventory');
    }

    // Remove items with atomic operation
    const removeResult = await Inventory.findOneAndUpdate(
      { 
        robloxId: userId,
        'ps99Items.instanceId': { $all: items.map(item => item.instanceId) }
      },
      {
        $pull: {
          ps99Items: {
            instanceId: { $in: items.map(item => item.instanceId) }
          }
        }
      },
      { session, new: true }
    );

    if (!removeResult) {
      throw new Error('Failed to remove items from inventory - items may have been used');
    }

    // Calculate total value
    const value = items.reduce((sum, item) => sum + item.value, 0);
    const joinRangeMin = Math.floor(value * 0.95);
    const joinRangeMax = Math.ceil(value * 1.05);

    // Generate server seed and hash for provably fair system
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    // Create the coinflip game
    const coinflip = new Coinflip({
      value,
      joinRangeMin,
      joinRangeMax,
      creator: String(userId),
      creatorAvatar: req.user.avatar || 'https://tr.rbxcdn.com/30dab1a854a6f3e8ebab500cc3de87a8/150/150/AvatarHeadshot/Png',
      creatorItems: items.map(item => ({
        instanceId: item.instanceId,
        name: item.name,
        value: item.value,
        image: item.image,
        game: item.game || 'ps99'
      })),
      creatorSide: side.toLowerCase(),
      joiner: null,
      joinerAvatar: null,
      joinerItems: [],
      serverSeed,
      serverSeedHash,
      randomSeed: null,
      normalizedResult: null,
      state: 'active',
      winner: null,
      createdAt: new Date(),
      endedAt: null
    });

    await coinflip.save({ session });

    await session.commitTransaction();
    
    // Release items only after successful commit
    await releaseItems(items);

    // Emit socket event for new game
    if (global.io) {
      global.io.emit('game_created', coinflip);
      if (global.cache) global.cache.del('active_coinflip_games');
    }

    res.json({
      success: true,
      game: {
        ...coinflip.toObject(),
        serverSeed: undefined
      }
    });

  } catch (error) {
    await session.abortTransaction();
    
    // Release items on error
    await releaseItems(items);
    
    console.error('Error creating game:', error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Export the joiningGames map so it can be accessed by socket handlers
module.exports = {
  router,
  joiningGames
}; 