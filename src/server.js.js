require('dotenv').config();
const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const User = require('./src/models/User');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const { Server } = require("socket.io");
const Inventory = require('./src/models/Inventory');
const MM2Item = require('./src/models/MM2Item');
const PS99Item = require('./src/models/PS99Item');
const { startUserMonitoring } = require('./userSync');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const NodeCache = require('node-cache');
const Announcement = require('./src/models/Announcement');
const Coinflip = require('./src/models/Coinflip');
const { generateServerSeed, generateRandomSeed, getResult, getSide } = require('./src/utils/provablyFair');
const Giveaway = require('./src/models/Giveaway');
// Import the withdraws router
const withdrawsRouter = require('./src/api/routes/withdraws');
const discordRoutes = require('./routes/discord');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  }
});

const ROBLOX_API = {
    USERS_ENDPOINT: 'https://users.roblox.com/v1/usernames/users',
    USER_DETAILS_ENDPOINT: 'https://users.roblox.com/v1/users/',
    THUMBNAILS_ENDPOINT: 'https://thumbnails.roblox.com/v1/users/avatar-headshot',
    REQUEST_TIMEOUT: 10000
};

// Trust proxy - required for production
app.set('trust proxy', 1);

// Middleware
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(bodyParser.json());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/bloxycoins',
        ttl: 24 * 60 * 60, // 24 hours
        autoRemove: 'native',
        touchAfter: 24 * 3600 // 24 hours
    })
}));

// Serve static files - ONLY from build directory
app.use(express.static(path.join(__dirname, 'build'), {
  dotfiles: 'ignore',
  etag: true,
  extensions: ['html', 'js', 'css', 'png', 'jpg', 'gif', 'ico'],
  index: ['index.html'],
  maxAge: '1d',
  redirect: false,
  setHeaders: function (res, path, stat) {
    // Prevent directory listing
    res.set('x-timestamp', Date.now());
    
    // Add security headers
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    
    // Cache static assets
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
  }
}));

// Prevent serving of server-side files
app.use('/*.js', (req, res, next) => {
  if (req.path.includes('server.js') || req.path.includes('userSync.js')) {
    return res.status(403).send('Access Denied');
  }
  next();
});

// Register routes
const coinflipRoutes = require('./src/routes/coinflip');
app.use('/api/coinflip', coinflipRoutes);

// Register giveaway routes
const giveawayRoutes = require('./src/api/routes/giveaways');
app.use('/api/giveaways', giveawayRoutes);

// Add caching for frequently accessed data
const cache = new NodeCache({ 
  stdTTL: 60, // Cache for 1 minute
  checkperiod: 120 // Check for expired entries every 2 minutes
});

// Optimize MongoDB connection pool
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bloxycoins', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: 50, // Reduced from 100 to prevent connection overhead
  minPoolSize: 10, // Add minimum pool size to maintain ready connections
            retryWrites: true,
        });

// Cache middleware for inventory data
const cacheInventory = async (req, res, next) => {
  const cacheKey = `inventory_${req.params.userId || req.params.robloxId}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return res.json(cachedData);
  }
  
  next();
};

// Cache middleware for user data
const cacheUser = async (req, res, next) => {
  const cacheKey = `user_${req.params.id}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return res.json(cachedData);
  }
  
  next();
};

// Function to ensure proper indexes
async function ensureIndexes() {
    let client;
    try {
        client = await MongoClient.connect(process.env.MONGODB_URI);
        const db = client.db('test');
        
        // Ensure indexes for inventories
        const inventoriesCollection = db.collection('inventories');
        console.log('Ensuring indexes for inventories collection...');
        
        // Define the indexes we want to create with their complete options and distinct names
        const desiredIndexes = [
            { 
                key: { robloxId: 1 }, 
                options: { 
                    unique: true, 
                    name: 'inventory_robloxId_unique' 
                } 
            },
            { 
                key: { username: 1 }, 
                options: { 
                    name: 'inventory_username' 
                } 
            },
            { 
                key: { 'mm2Items.instanceId': 1 }, 
                options: { 
                    unique: true, 
                    name: 'inventory_mm2_instanceId_unique',
                    background: true,
                    partialFilterExpression: { 'mm2Items.instanceId': { $exists: true } }
                } 
            },
            { 
                key: { 'ps99Items.instanceId': 1 }, 
                options: { 
                    unique: true, 
                    name: 'inventory_ps99_instanceId_unique',
                    background: true,
                    partialFilterExpression: { 'ps99Items.instanceId': { $exists: true } }
                } 
            }
        ];

        // Drop all existing indexes except _id_
        console.log('Dropping existing inventory indexes...');
        const existingIndexes = await inventoriesCollection.indexes();
        for (const index of existingIndexes) {
            if (index.name !== '_id_') {
                try {
                    await inventoriesCollection.dropIndex(index.name);
                    console.log(`Dropped inventory index: ${index.name}`);
                } catch (dropError) {
                    if (dropError.code !== 27) {
                        console.warn(`Could not drop inventory index ${index.name}: ${dropError.message}`);
                    }
                }
            }
        }

        // Create new indexes with proper options
        console.log('Creating new inventory indexes...');
        for (const index of desiredIndexes) {
            try {
                await inventoriesCollection.createIndex(index.key, index.options);
                console.log(`Created index: ${index.options.name}`);
            } catch (createError) {
                console.error(`Error creating index ${index.options.name}:`, createError.message);
                // If there's an error, try to drop the index and create it again
                try {
                    await inventoriesCollection.dropIndex(index.options.name);
                    console.log(`Dropped problematic index: ${index.options.name}`);
                    await inventoriesCollection.createIndex(index.key, index.options);
                    console.log(`Successfully recreated index: ${index.options.name}`);
                } catch (retryError) {
                    console.error(`Failed to recreate index ${index.options.name}:`, retryError.message);
                }
            }
        }
        console.log('✅ Inventory indexes ensured.');

        // Ensure indexes for users collection with distinct names
        const usersCollection = db.collection('users');
        console.log('Ensuring indexes for users collection...');
        
        // Define user indexes with distinct names
        const userIndexes = [
            { 
                key: { robloxId: 1 }, 
                options: { 
                    unique: true, 
                    name: 'user_robloxId_unique' 
                } 
            },
            { 
                key: { username: 1 }, 
                options: { 
                    unique: true, 
                    name: 'user_username_unique' 
                } 
            }
        ];

        // Drop existing user indexes
        console.log('Dropping existing user indexes...');
        const existingUserIndexes = await usersCollection.indexes();
        for (const index of existingUserIndexes) {
            if (index.name !== '_id_') {
                try {
                    await usersCollection.dropIndex(index.name);
                    console.log(`Dropped user index: ${index.name}`);
                } catch (dropError) {
                    if (dropError.code !== 27) {
                        console.warn(`Could not drop user index ${index.name}:`, dropError.message);
                    }
                }
            }
        }

        // Create new user indexes
        console.log('Creating new user indexes...');
        for (const index of userIndexes) {
            try {
                await usersCollection.createIndex(index.key, index.options);
                console.log(`Created user index: ${index.options.name}`);
            } catch (createError) {
                console.error(`Error creating index ${index.options.name}:`, createError.message);
                // If there's an error, try to drop the index and create it again
                try {
                    await usersCollection.dropIndex(index.options.name);
                    console.log(`Dropped problematic index: ${index.options.name}`);
                    await usersCollection.createIndex(index.key, index.options);
                    console.log(`Successfully recreated index: ${index.options.name}`);
                } catch (retryError) {
                    console.error(`Failed to recreate index ${index.options.name}:`, retryError.message);
                }
            }
        }
        console.log('✅ User indexes ensured.');
        
        // Ensure index for used verification codes with distinct name
        const usedCodesCollection = db.collection('used_verification_codes');
        console.log('Ensuring index for used_verification_codes collection...');
        try {
            await usedCodesCollection.createIndex(
                { code: 1 },
                { 
                    unique: true, 
                    name: 'verification_code_unique' 
                }
            );
            console.log('✅ Used verification code index ensured.');
        } catch (indexError) {
            console.error('Error creating used_verification_codes index:', indexError.message);
        }

        console.log('✅ All index ensuring processes complete.');
        
    } catch (error) {
        console.error('Error during ensureIndexes operation:', error.message);
        throw error;
    } finally {
        if (client) {
            try {
                await client.close();
                console.log("MongoDB client connection closed after ensureIndexes.");
            } catch (closeError) {
                console.error('Error closing MongoDB client:', closeError.message);
            }
        }
    }
}

// Call ensureIndexes after MongoDB connection
mongoose.connection.on('connected', async () => {
    console.log('✅ Connected to MongoDB');
    await ensureIndexes();
    startUserMonitoring();
});

async function genPhrase() {
    try {
        const response = await axios.get("https://random-word-api.herokuapp.com/word?number=5", {
            timeout: 5000,
            headers: {
                'Accept-Encoding': 'gzip, deflate',
                'Accept': 'application/json'
            }
        });
        const words = response.data;
        return `BLOXYCOINS-${words.join('-').toUpperCase()}`;
    } catch (error) {
        console.error('Error generating phrase:', error);
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(7).toUpperCase();
        return `BLOXYCOINS-${timestamp}-${random}`;
    }
}

async function getUserInfo(username) {
    try {
        const userResponse = await axios.post(ROBLOX_API.USERS_ENDPOINT, {
            usernames: [username],
            excludeBannedUsers: false
        }, {
            timeout: ROBLOX_API.REQUEST_TIMEOUT,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!userResponse.data.data.length) {
            return null;
        }

        const userId = userResponse.data.data[0].id;

        const [detailsResponse, thumbnailResponse] = await Promise.all([
            axios.get(`${ROBLOX_API.USER_DETAILS_ENDPOINT}${userId}`, {
                timeout: ROBLOX_API.REQUEST_TIMEOUT,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }),
            axios.get(`${ROBLOX_API.THUMBNAILS_ENDPOINT}?userIds=${userId}&size=150x150&format=png`, {
                timeout: ROBLOX_API.REQUEST_TIMEOUT,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            })
        ]);

        return {
            id: userId,
            name: detailsResponse.data.name,
            displayName: detailsResponse.data.displayName,
            description: detailsResponse.data.description,
            created: detailsResponse.data.created,
            isBanned: detailsResponse.data.isBanned,
            avatar: thumbnailResponse.data.data[0].imageUrl
        };

    } catch (error) {
        console.error('Error fetching user info:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            
            if (error.response.status === 405) {
                throw new Error('API endpoint method not allowed. Please try again later.');
            } else if (error.response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else if (error.response.status === 503) {
                throw new Error('Roblox API is temporarily unavailable. Please try again later.');
            }
        }
        throw new Error('Failed to fetch user information. Please try again.');
    }
}

// Check if verification code exists in user's description
async function verifyUserCode(userId, verificationCode) {
    try {
        const response = await axios.get(`${ROBLOX_API.USER_DETAILS_ENDPOINT}${userId}`, {
            timeout: ROBLOX_API.REQUEST_TIMEOUT,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const description = response.data.description || '';
        return description.includes(verificationCode);
    } catch (error) {
        console.error('Error verifying user code:', error);
        throw new Error('Failed to verify user code. Please try again.');
    }
}

// Session check endpoint
app.get('/api/session/check', async (req, res) => {
  try {
    if (req.session.userInfo) {
      res.json({ userInfo: req.session.userInfo });
    } else {
      res.json({ userInfo: null });
    }
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update the login endpoint
app.post('/api/login/check', async (req, res) => {
  try {
    const { username } = req.body;
    const userInfo = await getUserInfo(username);

    if (userInfo) {
      const verificationPhrase = await genPhrase();
      
      // Store verification data in session
      req.session.pendingVerification = {
        userInfo,
        verificationPhrase,
        timestamp: Date.now()
      };

      res.json({
        userId: userInfo.id,
        username: userInfo.name,
        displayName: userInfo.displayName,
        avatar: userInfo.avatar,
        phrase: verificationPhrase
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Login check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update the verify endpoint
app.post('/api/login/verify', async (req, res) => {
  let client;
  let session;
  try {
    const { userId, verificationCode } = req.body;
    const pendingVerification = req.session.pendingVerification;

    // Validate session and verification data
    if (!pendingVerification) {
      return res.status(400).json({ message: 'No pending verification found' });
    }

    if (pendingVerification.userInfo.id !== userId) {
      return res.status(400).json({ message: 'User ID mismatch' });
    }

    if (pendingVerification.verificationPhrase !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (Date.now() - pendingVerification.timestamp > 15 * 60 * 1000) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Connect to DB and start transaction
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    session = client.startSession();

    await session.withTransaction(async () => {
      const usersCollection = db.collection('users');
      const inventoriesCollection = db.collection('inventories');
      const usedCodesCollection = db.collection('usedCodes');

      // Check if code has been used
      const existingCode = await usedCodesCollection.findOne(
        { code: verificationCode },
        { session }
      );

      if (existingCode) {
        throw new Error('Verification code has already been used');
      }

      // Get user data
      const robloxId = pendingVerification.userInfo.id;
      const username = pendingVerification.userInfo.name;

      // Check if user exists
      const user = await usersCollection.findOne(
        { robloxId },
        { session }
      );

      if (user) {
        // Update existing user's details
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              robloxId,
              username,
              displayName: pendingVerification.userInfo.displayName,
              avatar: pendingVerification.userInfo.avatar,
              lastLogin: new Date()
            }
          },
          { session }
        );

        // Set session with existing user's info
        req.session.userInfo = {
          id: user.robloxId,
          name: user.username,
          displayName: pendingVerification.userInfo.displayName,
          avatar: pendingVerification.userInfo.avatar
        };
      } else {
        // Create new user if doesn't exist
        const newUser = {
          robloxId,
          username,
          displayName: pendingVerification.userInfo.displayName,
          avatar: pendingVerification.userInfo.avatar,
          lastLogin: new Date(),
          createdAt: new Date()
        };
        
        await usersCollection.insertOne(newUser, { session });

        // Set session with new user's info
        req.session.userInfo = {
          id: robloxId,
          name: username,
          displayName: pendingVerification.userInfo.displayName,
          avatar: pendingVerification.userInfo.avatar
        };

        // Create inventory for new user
        await inventoriesCollection.updateOne(
          { robloxId },
          {
            $setOnInsert: {
              username,
              displayName: pendingVerification.userInfo.displayName,
              avatar: pendingVerification.userInfo.avatar,
              mm2Items: [],
              ps99Items: [],
              stats: {
                mm2: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
                ps99: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
                overall: { totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 }
              }
            }
          },
          { upsert: true, session }
        );
      }

      // Mark verification code as used
      await usedCodesCollection.insertOne({
        code: verificationCode,
        userId: robloxId,
        usedAt: new Date()
      }, { session });

      // Clear pending verification
      delete req.session.pendingVerification;
    });

    // Save session explicitly before sending response
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ 
      success: true,
      userInfo: req.session.userInfo
    });

  } catch (error) {
    console.error('Verification error:', error);
    
    if (error.message === 'Verification code has already been used') {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.message === 'Could not verify code in profile') {
      return res.status(400).json({ message: 'Could not verify code in your profile. Please make sure you added it correctly.' });
    }
    
    res.status(500).json({ message: 'Internal server error during verification' });
  } finally {
    if (session) await session.endSession();
    if (client) await client.close();
  }
});

// Update logout endpoint to be more robust
app.post('/api/logout', (req, res) => {
  try {
    // Clear all session data
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
        return res.status(500).json({ message: 'Error during logout' });
      }
      
      // Clear any lingering session data
      req.session = null;
      
      res.json({ 
        success: true,
        message: 'Logged out successfully' 
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
      res.status(500).json({ message: 'Error during logout' });
  }
});

// Admin API key middleware
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer BLOXROLL-AISJINANSUA_AAAAAAAAANaaaaaas`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Admin API routes
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const users = await db.collection('users').find({}).toArray();
    await client.close();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.get('/api/admin/items/mm2', adminAuth, async (req, res) => {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const items = await db.collection('mm2items').find({}).toArray();
    await client.close();
    res.json(items);
  } catch (error) {
    console.error('Error fetching MM2 items:', error);
    res.status(500).json({ error: 'Error fetching items' });
  }
});

app.get('/api/admin/items/ps99', adminAuth, async (req, res) => {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const items = await db.collection('ps99items').find({}).toArray();
    await client.close();
    res.json(items);
  } catch (error) {
    console.error('Error fetching PS99 items:', error);
    res.status(500).json({ error: 'Error fetching items' });
  }
});

// Add new admin endpoints for the bot
app.get('/api/items/search', adminAuth, async (req, res) => {
  try {
    const { game } = req.query;
    if (!game) {
      return res.status(400).json({ error: 'Game parameter is required' });
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const collection = game.toLowerCase() === 'mm2' ? 'mm2items' : 'ps99items';
    const items = await db.collection(collection).find({}).toArray();
    await client.close();
    
    res.json({ items });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ error: 'Error searching items' });
  }
});

// Get user inventory endpoint
app.get('/api/inventory/:robloxId/items', adminAuth, async (req, res) => {
  try {
    const { robloxId } = req.params;
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const inventory = await db.collection('inventories').findOne({ robloxId });
    await client.close();
        
    if (!inventory) {
    return res.json({
      success: true,
        data: {
          items: [],
          stats: {
            mm2: {
              itemCount: 0,
              totalValue: 0,
              profit: 0,
              wager: 0,
              gamesPlayed: 0,
              wins: 0,
              losses: 0
            },
            ps99: {
              itemCount: 0,
              totalValue: 0,
              profit: 0,
              wager: 0,
              gamesPlayed: 0,
              wins: 0,
              losses: 0
            },
            overall: {
              totalValue: 0,
              profit: 0,
              wager: 0,
              gamesPlayed: 0,
              wins: 0,
              losses: 0
            }
          }
        }
      });
    }
        
    // Format response
    const formattedItems = [
      ...(inventory.mm2Items || []).map(item => ({
        ...item,
        game: 'MM2'
      })),
      ...(inventory.ps99Items || []).map(item => ({
        ...item,
        game: 'PS99'
      }))
    ];
        
    res.json({ 
      success: true,
      data: {
        items: formattedItems,
        stats: inventory.stats || {
          mm2: {
            itemCount: 0,
            totalValue: 0,
            profit: 0,
            wager: 0,
            gamesPlayed: 0,
            wins: 0,
            losses: 0
          },
          ps99: {
            itemCount: 0,
            totalValue: 0,
            profit: 0,
            wager: 0,
            gamesPlayed: 0,
            wins: 0,
            losses: 0
          },
          overall: {
            totalValue: 0,
            profit: 0,
            wager: 0,
            gamesPlayed: 0,
            wins: 0,
            losses: 0
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
});

// Add items to inventory endpoint
app.post('/api/admin/inventory/add', adminAuth, async (req, res) => {
  let client;
  try {
    const { userId, items } = req.body;
    if (!userId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const inventoriesCollection = db.collection('inventories');

    // Get user's current inventory
    let userInventory = await inventoriesCollection.findOne({ robloxId: userId });
    
    if (!userInventory) {
      // Create new inventory if it doesn't exist
      userInventory = {
        robloxId: userId,
        mm2Items: [],
        ps99Items: [],
        stats: {
          mm2: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
          ps99: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
          overall: { totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 }
        }
      };
    }

    // Process each item
    items.forEach(item => {
      const gameItems = item.game.toLowerCase() === 'mm2' ? 'mm2Items' : 'ps99Items';
      const gameStats = item.game.toLowerCase() === 'mm2' ? 'mm2' : 'ps99';
      
      // Add or update item in inventory
      const existingItemIndex = userInventory[gameItems].findIndex(i => i.name === item.name);
      if (existingItemIndex !== -1) {
        userInventory[gameItems][existingItemIndex].quantity += item.quantity;
      } else {
        userInventory[gameItems].push({
          name: item.name,
          value: item.value,
          quantity: item.quantity,
          image: item.image,
          addedAt: new Date(),
          instanceId: new ObjectId().toString()
        });
      }

      // Update stats
      userInventory.stats[gameStats].itemCount += item.quantity;
      userInventory.stats[gameStats].totalValue += item.value * item.quantity;
      userInventory.stats.overall.totalValue += item.value * item.quantity;
    });

    // Save updated inventory
    if (userInventory._id) {
      await inventoriesCollection.updateOne(
        { _id: userInventory._id },
        { $set: userInventory }
      );
    } else {
      await inventoriesCollection.insertOne(userInventory);
    }

    // Log the admin action
    console.log(`[ADMIN] Added items to user ${userId}:`, items);
    
    res.json({ success: true, message: 'Items added successfully' });
  } catch (error) {
    console.error('Error adding items:', error);
    res.status(500).json({ error: 'Error adding items' });
  } finally {
    if (client) await client.close();
  }
});

// Add remove items endpoint
app.post('/api/admin/inventory/remove', adminAuth, async (req, res) => {
  let client;
  try {
    const { userId, items } = req.body;
    if (!userId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const inventoriesCollection = db.collection('inventories');

    // Get user's current inventory
    let userInventory = await inventoriesCollection.findOne({ robloxId: userId });
    if (!userInventory) {
      return res.status(404).json({ error: 'User inventory not found' });
    }

    // Process each item for removal
    items.forEach(item => {
      const gameItems = item.game.toLowerCase() === 'mm2' ? 'mm2Items' : 'ps99Items';
      const gameStats = item.game.toLowerCase() === 'mm2' ? 'mm2' : 'ps99';
      
      // Find and remove the item
      const itemIndex = userInventory[gameItems].findIndex(i => i.name === item.name);
      if (itemIndex !== -1) {
        const removedItem = userInventory[gameItems][itemIndex];
        
        // Update stats
        userInventory.stats[gameStats].itemCount -= removedItem.quantity;
        userInventory.stats[gameStats].totalValue -= removedItem.value * removedItem.quantity;
        userInventory.stats.overall.totalValue -= removedItem.value * removedItem.quantity;
        
        // Remove the item
        userInventory[gameItems].splice(itemIndex, 1);
      }
    });

    // Save updated inventory
    await inventoriesCollection.updateOne(
      { _id: userInventory._id },
      { $set: userInventory }
    );

    // Log the admin action
    console.log(`[ADMIN] Removed items from user ${userId}:`, items);
    
    res.json({ success: true, message: 'Items removed successfully' });
  } catch (error) {
    console.error('Error removing items:', error);
    res.status(500).json({ error: 'Error removing items' });
  } finally {
    if (client) await client.close();
  }
});

// Socket.io chat system
const chatHistory = [];
const MAX_CHAT_HISTORY = 50;
const userMessageTimers = new Map(); // For rate limiting
const MESSAGE_COOLDOWN_MS = 1000; // 1 second cooldown between messages
const MAX_MESSAGES_PER_MINUTE = 15; // Maximum messages per minute

// Function to filter profanity
const filterProfanity = (text) => {
  // Simple profanity filter - should be expanded in production
  const profanityList = [
    'nigga', 'nigger', 'dick', 'pussy', 'cunt', 
    'whore', 'slut', 'faggot', 'retard', 'retarded'
  ];
  
  let filteredText = text;
  profanityList.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filteredText = filteredText.replace(regex, '***');
  });
  
  return filteredText;
};

// Rate limiter middleware for the chat
const rateLimitChat = (userId) => {
  // Initialize if this is a new user
  if (!userMessageTimers.has(userId)) {
    userMessageTimers.set(userId, {
      lastMessageTime: 0,
      messageCount: 0,
      minuteTimer: null
    });
    
    // Reset message count after one minute
    const resetTimer = setTimeout(() => {
      if (userMessageTimers.has(userId)) {
        userMessageTimers.get(userId).messageCount = 0;
        userMessageTimers.get(userId).minuteTimer = null;
      }
    }, 60000);
    
    userMessageTimers.get(userId).minuteTimer = resetTimer;
  }
  
  const userData = userMessageTimers.get(userId);
  const now = Date.now();
  
  // Check cooldown between messages
  if (now - userData.lastMessageTime < MESSAGE_COOLDOWN_MS) {
    return { allowed: false, reason: 'Too fast! Please wait a moment before sending another message.' };
  }
  
  // Check rate limit
  if (userData.messageCount >= MAX_MESSAGES_PER_MINUTE) {
    return { allowed: false, reason: 'You\'re sending too many messages. Please wait a bit.' };
  }
  
  // Update user data
  userData.lastMessageTime = now;
  userData.messageCount++;
  
  // Refresh the minute timer if needed
  if (!userData.minuteTimer) {
    const resetTimer = setTimeout(() => {
      if (userMessageTimers.has(userId)) {
        userMessageTimers.get(userId).messageCount = 0;
        userMessageTimers.get(userId).minuteTimer = null;
      }
    }, 60000);
    
    userData.minuteTimer = resetTimer;
  }
  
  return { allowed: true };
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Add user to the socket data
  socket.data.userId = null;
  
  // Send chat history to newly connected user
  socket.emit('chat-history', chatHistory);
  
  // Listen for authentication - require user ID for chat
  socket.on('authenticate', (data) => {
    if (data && data.userId) {
      socket.data.userId = data.userId;
      console.log(`User ${data.userId} authenticated`);
    }
  });
  
  // Listen for new messages
  socket.on('send-message', (data) => {
    // Basic validation
    if (!data.message || !data.userId || !data.username || !data.avatar) {
      return socket.emit('error', { message: 'Invalid message data' });
    }
    
    // Rate limiting
    const rateCheck = rateLimitChat(data.userId);
    if (!rateCheck.allowed) {
      return socket.emit('error', { message: rateCheck.reason });
    }
    
    // Filter message for profanity
    const filteredMessage = filterProfanity(data.message.substring(0, 200));
    
    // Create message object
    const message = {
      id: Date.now(),
      userId: data.userId,
      username: data.username,
      message: filteredMessage,
      avatar: data.avatar,
      timestamp: new Date()
    };
    
    // Add to history and limit size
    chatHistory.push(message);
    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.shift();
    }
    
    // Broadcast to all clients
    io.emit('new-message', message);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Listen for new coinflip games
  socket.on('coinflip_created', (game) => {
    io.emit('game_created', game);
    // Clear the active games cache
    cache.del('active_coinflip_games');
  });

  // Listen for game updates (when someone joins)
  socket.on('coinflip_joined', async (gameData) => {
    try {
      // Get the game data
      const game = await db.collection('coinflips').findOne({ _id: new ObjectId(gameData.gameId) });
      if (!game) return;

      // Get the joiner's info from users collection
      const joinerInfo = await db.collection('users').findOne({ robloxId: String(gameData.joiner) });
      
      // Get joiner's avatar from Roblox API
      let joinerAvatar;
      try {
        const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${gameData.joiner}&size=150x150&format=Png`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        });
        if (response.data?.data?.[0]?.imageUrl) {
          joinerAvatar = response.data.data[0].imageUrl;
          
          // Update the user's avatar in the database
          await db.collection('users').updateOne(
            { robloxId: String(gameData.joiner) },
            { $set: { avatar: response.data.data[0].imageUrl } }
          );
        }
      } catch (error) {
        console.error('Error fetching joiner avatar:', error);
      }

      // Use the API avatar, or fallback to stored avatar, or default
      joinerAvatar = joinerAvatar || joinerInfo?.avatar || '/default_avatar.png';

      // Update the game with the joiner's avatar
      await db.collection('coinflips').updateOne(
        { _id: new ObjectId(gameData.gameId) },
        { $set: { joinerAvatar: joinerAvatar } }
      );

      // Get the creator's info
      const creatorInfo = await db.collection('users').findOne({ robloxId: String(game.creator) });

      // Emit game_joined event with complete info
      io.emit('game_joined', {
        gameId: game._id.toString(),
        joiner: gameData.joiner,
        joinerAvatar: joinerAvatar,
        joinerName: joinerInfo?.username || 'Unknown',
        joinerSide: game.creatorSide === 'heads' ? 'tails' : 'heads',
        creator: game.creator,
        creatorAvatar: creatorInfo?.avatar || game.creatorAvatar || '/default_avatar.png',
        creatorName: creatorInfo?.username || 'Unknown',
        creatorSide: game.creatorSide,
        value: game.value,
        totalValue: game.value * 2,
        creatorItems: game.creatorItems,
        joinerItems: gameData.joinerItems,
        state: 'joined'
      });

      // Clear active games cache
      cache.del('active_coinflip_games');
    } catch (error) {
      console.error('Error in coinflip_joined event:', error);
    }
  });

  // Listen for game completions
  socket.on('coinflip_completed', async (game) => {
    try {
      // Get the complete game data
      const gameData = await db.collection('coinflips').findOne({ _id: new ObjectId(game._id || game.id) });
      if (!gameData) return;

      // Get both users' info
      const [joinerInfo, creatorInfo] = await Promise.all([
        db.collection('users').findOne({ robloxId: String(gameData.joiner) }),
        db.collection('users').findOne({ robloxId: String(gameData.creator) })
      ]);

      // Get joiner's avatar from Roblox API
      let joinerAvatar;
      try {
        const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${gameData.joiner}&size=150x150&format=Png`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        });
        if (response.data?.data?.[0]?.imageUrl) {
          joinerAvatar = response.data.data[0].imageUrl;
          
          // Update the user's avatar in the database
          await db.collection('users').updateOne(
            { robloxId: String(gameData.joiner) },
            { $set: { avatar: response.data.data[0].imageUrl } }
          );
        }
      } catch (error) {
        console.error('Error fetching joiner avatar:', error);
      }

      // Use the API avatar, or fallback to stored avatar, or default
      joinerAvatar = joinerAvatar || joinerInfo?.avatar || gameData.joinerAvatar || '/default_avatar.png';

      // Update the game with the joiner's avatar before deletion
      await db.collection('coinflips').updateOne(
        { _id: new ObjectId(game._id || game.id) },
        { $set: { joinerAvatar: joinerAvatar } }
      );

      // Emit game_ended event with complete info
      io.emit('game_ended', {
        gameId: gameData._id.toString(),
        winner: gameData.winner,
        winningSide: gameData.winningSide,
        joinerAvatar: joinerAvatar,
        joinerName: joinerInfo?.username || gameData.joinerName || 'Unknown',
        creatorAvatar: creatorInfo?.avatar || gameData.creatorAvatar || '/default_avatar.png',
        creatorName: creatorInfo?.username || gameData.creatorName || 'Unknown',
        creatorSide: gameData.creatorSide,
        value: gameData.value,
        totalValue: gameData.totalValue || (gameData.value * 2),
        creatorItems: gameData.creatorItems,
        joinerItems: gameData.joinerItems,
        state: 'ended'
      });

      // Clear active games cache
      cache.del('active_coinflip_games');
    } catch (error) {
      console.error('Error in coinflip_completed event:', error);
    }
  });

  // Listen for game cancellations
  socket.on('coinflip_cancelled', (gameId) => {
    io.emit('game_deleted', gameId);
    // Clear the active games cache
    cache.del('active_coinflip_games');
  });

  // Listen for game joins
  socket.on('game_joined', async (gameId) => {
    try {
      // Get the game data
      const game = await db.collection('coinflips').findOne({ _id: new ObjectId(gameId) });
      if (!game) return;

      // Get the joiner's info
      const joinerInfo = await db.collection('users').findOne({ _id: game.joiner });
      if (!joinerInfo) return;

      // Emit game_joined event with complete joiner info
      io.emit('game_joined', {
        ...game,
        gameId: game._id,
        joinerAvatar: joinerInfo.avatar || '/default_avatar.png',
        joinerName: joinerInfo.username,
        state: 'ended'
      });

      // Clear active games cache
      activeGamesCache.clear();
    } catch (error) {
      console.error('Error in game_joined event:', error);
    }
  });
});

// Add a chat API endpoint for non-WebSocket clients
app.get('/api/chat/messages', (req, res) => {
  res.json(chatHistory);
});

// Add an endpoint to post messages for non-WebSocket clients
app.post('/api/chat/messages', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Check if user is logged in
    if (!req.session.userInfo) {
      return res.status(401).json({ message: 'You must be logged in to send messages' });
    }
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Invalid message' });
    }
    
    // Rate limiting
    const userId = req.session.userInfo.id;
    const rateCheck = rateLimitChat(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({ message: rateCheck.reason });
    }
    
    // Filter message for profanity
    const filteredMessage = filterProfanity(message.substring(0, 200));
    
    const newMessage = {
      id: Date.now(),
      userId: req.session.userInfo.id,
      username: req.session.userInfo.name,
      message: filteredMessage,
      avatar: req.session.userInfo.avatar,
      timestamp: new Date()
    };
    
    // Add to history and limit size
    chatHistory.push(newMessage);
    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.shift();
    }
    
    // Broadcast to all WebSocket clients
    io.emit('new-message', newMessage);
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Get user items for withdrawal/gambling
app.get('/api/inventory/:userId/items', cacheInventory, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      game = 'ALL', 
      page = 1, 
      limit = 20,
      sort = 'value',
      search = ''
    } = req.query;

    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');

    // Use projection to only get needed fields
    const projection = {
      mm2Items: 1,
      ps99Items: 1,
      'stats.mm2': 1,
      'stats.ps99': 1,
      'stats.overall': 1
    };

    const inventory = await db.collection('inventories').findOne(
      { robloxId: parseInt(userId) },
      { projection }
    );
        
        if (!inventory) {
      return res.status(404).json({
        error: 'Inventory not found',
        details: 'User inventory does not exist'
      });
    }

    // Filter and process items
    let items = [];
    if (game === 'ALL') {
      items = [
        ...(inventory.mm2Items || []).map(item => ({ ...item, game: 'MM2' })),
        ...(inventory.ps99Items || []).map(item => ({ ...item, game: 'PS99' }))
      ];
    } else if (game === 'MM2') {
      items = (inventory.mm2Items || []).map(item => ({ ...item, game: 'MM2' }));
    } else if (game === 'PS99') {
      items = (inventory.ps99Items || []).map(item => ({ ...item, game: 'PS99' }));
    }

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      items = items.filter(item => searchRegex.test(item.name));
    }

    // Sort items
    if (sort === 'value') {
      items.sort((a, b) => (b.value * b.quantity) - (a.value * a.quantity));
    } else if (sort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'recent') {
      items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }

    // Paginate results
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    const response = {
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: inventory.stats
      }
    };

    // Cache the response
    cache.set(`inventory_${userId}`, response);

    res.json(response);
    await client.close();

  } catch (error) {
    console.error('Error fetching user items:', error);
    res.status(500).json({
      error: 'Error fetching user items',
      details: error.message
    });
  }
});

// Get current user and inventory data
app.get('/api/user/current', async (req, res) => {
  let client;
  try {
    // Check if user is logged in
    if (!req.session.userInfo) {
      return res.status(401).json({ message: 'Not logged in' });
    }

    // Connect to database
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    
    // Get user's inventory
    const inventory = await db.collection('inventories').findOne(
      { robloxId: String(req.session.userInfo.id) }
    );

    // Combine session user info with inventory data
    const userData = {
      user: {
        id: req.session.userInfo.id,
        name: req.session.userInfo.name,
        displayName: req.session.userInfo.displayName,
        avatar: req.session.userInfo.avatar
      },
      inventory: inventory || {
        mm2Items: [],
        ps99Items: [],
        stats: {
          mm2: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
          ps99: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
          overall: { totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 }
        }
      }
    };

    res.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Admin panel routes
app.get('/admin-panel/BLOXROLL-SECURE-ADMIN-PANEL-ACCESS-KEY-AISJINANSUA_AAAAAAAAANaaaaaas-DEVELOPMENT-SERVER-2024-AUTHORIZED-ACCESS-ONLY-DO-NOT-SHARE', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Get user's total value endpoint
app.get('/api/user/total-value/:robloxId', async (req, res) => {
  let client;
  try {
    const { robloxId } = req.params;
    
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const inventoriesCollection = db.collection('inventories');

    // Get user's inventory
    const inventory = await inventoriesCollection.findOne({ robloxId });
        
        if (!inventory) {
      return res.json({ totalValue: 0 });
    }

    // Return the overall total value from stats
        res.json({
      totalValue: inventory.stats.overall.totalValue || 0
    });

  } catch (error) {
    console.error('Error fetching total value:', error);
    res.status(500).json({ error: 'Error fetching total value' });
  } finally {
    if (client) await client.close();
  }
});

// Auth middleware
const auth = (req, res, next) => {
  if (!req.session.userInfo) {
    return res.status(401).json({ error: 'Unauthorized - Please log in' });
  }
  req.user = {
    robloxId: req.session.userInfo.id,
    username: req.session.userInfo.name
  };
  next();
};

// First, add a constant for the tax rate and max tax
const COINFLIP_TAX_RATE = 0.10; // 10% tax
const MAX_TAX_VALUE = 1000000000; // 1 billion max tax
const TAX_RECIPIENT_USERNAME = "matetsss"; // Username to receive tax items

// Function to handle coinflip tax
const handleCoinflipTax = async (game, winnerId, winnerItems, session, db) => {
  if (!winnerItems || !Array.isArray(winnerItems) || winnerItems.length === 0) return { taxedItems: [] };
  
  // Calculate total pot value
  const totalPotValue = (game.creatorItems || []).reduce((sum, item) => sum + item.value, 0) +
                       (game.joinerItems || []).reduce((sum, item) => sum + item.value, 0);
  
  // Sort items by value (highest first)
  const sortedItems = [...winnerItems].sort((a, b) => b.value - a.value);
  
  const taxedItems = [];
  let totalTaxValue = 0;
  const targetTaxAmount = Math.min(
    totalPotValue * COINFLIP_TAX_RATE,
    MAX_TAX_VALUE
  );
  
  // Collect items for tax until we reach the target amount
  for (const item of sortedItems) {
    if (totalTaxValue >= targetTaxAmount) break;
    
    taxedItems.push(item);
    totalTaxValue += item.value;
    
    // Remove the item from winner's inventory
    const gameType = game.gameType || 'ps99';
    const itemsField = gameType === 'mm2' ? 'mm2Items' : 'ps99Items';
    const statsField = gameType === 'mm2' ? 'mm2' : 'ps99';
    
    await db.collection('inventories').updateOne(
      { robloxId: String(winnerId) },
      { 
        $pull: { [itemsField]: { name: item.name } },
        $inc: {
          [`stats.${statsField}.totalValue`]: -item.value,
          [`stats.${statsField}.itemCount`]: -1,
          'stats.overall.totalValue': -item.value
        }
      },
      { session }
    );
  }
  
  let taxPoolUpdate = { previousTaxPool: 0, newTaxPool: 0 };
  
  if (taxedItems.length > 0) {
    try {
      // Add taxed items to matetsss's inventory
      const taxRecipient = await db.collection('inventories').findOne(
        { username: TAX_RECIPIENT_USERNAME },
        { session }
      );
      
      if (taxRecipient) {
        const gameType = game.gameType || 'ps99';
        const itemsField = gameType === 'mm2' ? 'mm2Items' : 'ps99Items';
        const statsField = gameType === 'mm2' ? 'mm2' : 'ps99';
        
        for (const item of taxedItems) {
          await db.collection('inventories').updateOne(
            { username: TAX_RECIPIENT_USERNAME },
            { 
              $push: { 
                [itemsField]: {
                  ...item,
                  addedAt: new Date(),
                  instanceId: new ObjectId().toString()
                }
              },
              $inc: {
                [`stats.${statsField}.totalValue`]: item.value,
                [`stats.${statsField}.itemCount`]: 1,
                'stats.overall.totalValue': item.value
              }
            },
            { session }
          );
        }
      }
      
      // Update the tax pool in the Stats model
      // Calculate amount to add to giveaway pool (15% of tax)
      const giveawayAmount = Math.floor(totalTaxValue * 0.15);
      console.log(`Adding ${giveawayAmount} to tax pool for giveaway (15% of ${totalTaxValue})`);
      
      // Get current tax pool
      const StatsModel = mongoose.model('Stats');
      const statsData = await StatsModel.findOne() || {};
      const currentTaxPool = statsData.taxPool || 0;
      console.log(`Current tax pool: ${currentTaxPool}`);
      
      // Update tax pool
      await StatsModel.updateOne(
        {},
        { $inc: { taxPool: giveawayAmount } },
        { upsert: true }
      );
      
      // Verify the update
      const updatedStats = await StatsModel.findOne();
      console.log(`Updated tax pool: ${updatedStats.taxPool}`);
      console.log(`Biggest win: ${updatedStats.biggestWin}`);
      
      taxPoolUpdate = {
        previousTaxPool: currentTaxPool,
        newTaxPool: updatedStats.taxPool,
        giveawayAmount
      };
      
      // Force an immediate stats update if calculateCoinflipStats is available
      if (typeof calculateCoinflipStats === 'function') {
        console.log("Calculating updated stats after tax collection...");
        const refreshedStats = await calculateCoinflipStats();
        
        // Broadcast updated stats to all clients
        if (global.io) {
          global.io.emit('coinflip_stats', refreshedStats);
          console.log("Stats broadcast to all clients after tax collection");
        }
      }
      
      // Send webhook notification to Discord
      const formatValue = (value) => {
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
        return value.toString();
      };
      
      // Get usernames for winner and loser
      const winnerUser = await db.collection('users').findOne({ robloxId: String(winnerId) }, { session });
      const loserUser = await db.collection('users').findOne({ 
        robloxId: String(game.creator === winnerId ? game.joiner : game.creator) 
      }, { session });
      
      const winnerName = winnerUser ? winnerUser.displayName || winnerUser.username : winnerId;
      const loserName = loserUser ? loserUser.displayName || loserUser.username : 
                      (game.creator === winnerId ? game.joiner : game.creator);
      
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
            name: 'Added to Giveaway',
            value: formatValue(giveawayAmount),
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
      
      await axios.post(taxWebhookUrl, {
        embeds: [embed]
      }).catch(error => console.error('Discord webhook error:', error));
      
    } catch (error) {
      console.error('Error applying coinflip tax:', error);
    }
  }
  
  return { 
    taxedItems, 
    taxAmount: totalTaxValue, 
    taxPercentage: totalPotValue > 0 ? (totalTaxValue / totalPotValue) * 100 : 0,
    totalPotValue,
    totalTaxValue,
    ...taxPoolUpdate
  };
};

// Initialize stats in MongoDB
const initializeStats = async (db) => {
  const stats = await db.collection('stats').findOne({ type: 'coinflip' });
  if (!stats) {
    await db.collection('stats').insertOne({
      type: 'coinflip',
      totalGames: 0,
      totalWagered: 0,
      taxGivenOut: 0,
      lastUpdated: new Date()
    });
  }
};

// Update stats when game is created
const updateStatsOnGameCreate = async (db, gameValue) => {
  await db.collection('stats').updateOne(
    { type: 'coinflip' },
    {
      $inc: {
        totalGames: 1,
        totalWagered: gameValue
      },
      $set: { lastUpdated: new Date() }
    }
  );
};

// Update stats when game ends
const updateStatsOnGameEnd = async (db, game, winner, session) => {
  const totalPotValue = game.value * 2; // Total value of the game (creator + joiner)
  
  // Get winner's username
  const winnerUser = await db.collection('users').findOne(
    { robloxId: String(winner) },
    { projection: { username: 1, displayName: 1, avatar: 1 } },
    { session }
  );

  const winnerName = winnerUser?.displayName || winnerUser?.username || winner;
  const winnerAvatar = winnerUser?.avatar || 'default_avatar.png';

  // Update stats
  await db.collection('stats').updateOne(
    { type: 'coinflip' },
    {
      $inc: { 
        totalGames: 1,
        totalWagered: totalPotValue
      },
      $set: { lastUpdated: new Date() }
    },
    { session }
  );

  // Emit updated stats to all clients
  const updatedStats = await db.collection('stats').findOne({ type: 'coinflip' }, { session });
  io.emit('stats_update', {
    totalGames: updatedStats.totalGames,
    totalWagered: updatedStats.totalWagered,
    taxGivenOut: updatedStats.taxGivenOut
  });
};

// Get coinflip stats endpoint
app.get('/api/coinflip/stats', async (req, res) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    
    const stats = await db.collection('stats').findOne({ type: 'coinflip' });
    
    // Clean stats older than 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (stats.biggestWin.timestamp < twentyFourHoursAgo) {
      stats.biggestWin = { amount: 0, timestamp: new Date() };
      await db.collection('stats').updateOne(
        { type: 'coinflip' },
        { $set: { biggestWin: stats.biggestWin } }
      );
    }

    res.json({
      success: true,
      stats: {
        totalGames: stats.totalGames,
        totalWagered: stats.totalWagered,
        biggestWin: stats.biggestWin.amount,
        taxGivenOut: stats.taxGivenOut
      }
    });
  } catch (error) {
    console.error('Error fetching coinflip stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Create coinflip game
app.post('/api/coinflip/create', auth, async (req, res) => {
  let client;
  try {
    // Validate input
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    // Connect to database
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');

    // Calculate total value
    const value = req.body.items.reduce((sum, item) => sum + item.value, 0);

    // Calculate join range (5% of value)
    const joinRangeMin = Math.floor(value * 0.95);
    const joinRangeMax = Math.ceil(value * 1.05);

    // Generate server seed and hash for provably fair system
    const { serverSeed, serverSeedHash } = generateServerSeed();

      // Create the coinflip game
      const coinflip = {
      value,
      joinRangeMin,
      joinRangeMax,
        creator: String(req.session.userInfo.id),
        creatorAvatar: req.session.userInfo.avatar || 'default_avatar.png',
      creatorItems: req.body.items.map(item => ({
        instanceId: item.instanceId,
        name: item.name,
        value: item.value,
        image: item.image,
        game: item.game || 'ps99'
      })),
        creatorSide: req.body.side.toLowerCase(),
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
    };

    // Insert the game
    const result = await db.collection('coinflips').insertOne(coinflip);

    // Remove items from inventory
    const itemNames = req.body.items.map(item => item.name);
    await db.collection('inventories').updateOne(
      { robloxId: String(req.session.userInfo.id) },
      { 
        $pull: { 'ps99Items': { name: { $in: itemNames } } },
        $inc: {
          'stats.ps99.itemCount': -req.body.items.length,
          'stats.ps99.totalValue': -value,
          'stats.overall.totalValue': -value
        }
      }
    );

    // Emit socket event for new game
    if (io) {
      io.emit('game_created', { ...coinflip, _id: result.insertedId });
      cache.del('active_coinflip_games');
    }

    res.json({ 
      success: true, 
      game: { 
        ...coinflip, 
        _id: result.insertedId,
        serverSeed: undefined // Don't send server seed to client yet
      } 
    });

  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
});

// Join coinflip game
app.post('/api/coinflip/:gameId/join', auth, async (req, res) => {
  let client;
  let session;

  try {
    const gameId = req.params.gameId;
    if (!gameId || !ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    // Connect to database and start transaction
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    session = client.startSession();

    let result;
    await session.withTransaction(async () => {
      // Find and lock the game atomically
      const game = await db.collection('coinflips').findOne(
        { 
          _id: new ObjectId(gameId),
          state: 'active',
          joiner: null
        },
        { session }
      );

      if (!game) {
        throw new Error('Game not found or already joined');
      }

      // Calculate joiner's total value
      const joinerValue = req.body.items.reduce((sum, item) => sum + item.value, 0);
      const totalValue = game.value + joinerValue;

      // Validate join range
      if (joinerValue < game.joinRangeMin || joinerValue > game.joinRangeMax) {
        throw new Error('Item value outside of join range');
      }

      // Generate random seed and get result
      const randomSeed = generateRandomSeed();
      const normalizedResult = getResult(game.serverSeedHash, randomSeed);
      
      // Determine winning side based on normalized result (0.5 threshold)
      const winningSide = normalizedResult < 0.5 ? 'heads' : 'tails';
      const winner = winningSide === game.creatorSide ? game.creator : String(req.session.userInfo.id);

      // Get joiner's avatar from Roblox API
      let joinerAvatar;
      try {
        const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${req.session.userInfo.id}&size=150x150&format=Png`, {
          timeout: 3000,
          headers: { 'Accept': 'application/json' }
        });
        joinerAvatar = response.data?.data?.[0]?.imageUrl;
      } catch (error) {
        console.error('Error fetching joiner avatar:', error);
      }

      // Use API avatar or fallback
      joinerAvatar = joinerAvatar || req.session.userInfo.avatar || '/default_avatar.png';

      // Get creator's info for consistent data
      const creatorUser = await db.collection('users').findOne(
        { robloxId: String(game.creator) },
        { session }
      );

      // Prepare complete game data
      const completeGameData = {
        gameId: game._id.toString(),
        // Winner info
        winner,
        winningSide,
        // Creator info
        creator: game.creator,
        creatorAvatar: creatorUser?.avatar || game.creatorAvatar || '/default_avatar.png',
        creatorName: creatorUser?.username || game.creatorName || 'Unknown',
        creatorSide: game.creatorSide,
        creatorItems: game.creatorItems,
        // Joiner info
        joiner: String(req.session.userInfo.id),
        joinerAvatar,
        joinerName: req.session.userInfo.name,
        joinerSide: game.creatorSide === 'heads' ? 'tails' : 'heads',
        joinerItems: req.body.items,
        // Values
        value: game.value,
        totalValue,
        // Game state
        state: 'ended',
        // Provably fair data
        serverSeed: game.serverSeed,
        serverSeedHash: game.serverSeedHash,
        randomSeed,
        normalizedResult
      };

      // Update game in database
      await db.collection('coinflips').updateOne(
        { 
          _id: new ObjectId(gameId),
          state: 'active',
          joiner: null
        },
        {
          $set: {
            ...completeGameData,
            endedAt: new Date()
          }
        },
        { session }
      );

      // Emit socket events with complete data
      if (io) {
        // Single emission of game_ended with all necessary data
        io.emit('game_ended', completeGameData);
        
        // Clear cache
        cache.del('active_coinflip_games');
      }

      result = completeGameData;
    });

    res.json({ 
      success: true, 
      game: result
    });

  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    if (session) await session.endSession();
    if (client) await client.close();
  }
});

// Add a function to determine the winner of a coinflip game
const determineWinner = (game) => {
  // Randomly select heads or tails
  const sides = ['heads', 'tails'];
  const winningSide = sides[Math.floor(Math.random() * sides.length)];
  
  // Determine the winner based on the winning side
  const winner = winningSide === game.creatorSide ? game.creator : game.joiner;
  
  return { winningSide, winner };
};

// Add a function to give items to winner
const transferItemsToWinner = async (game, winnerId, taxedItems, session, db) => {
  try {
    const gameType = game.gameType || 'ps99';
    const itemsField = gameType === 'mm2' ? 'mm2Items' : 'ps99Items';
    const statsField = gameType === 'mm2' ? 'mm2' : 'ps99';
    
    // Combine all items from the game
    const allItems = [...(game.creatorItems || []), ...(game.joinerItems || [])];
    
    // Filter out the taxed items
    const taxedItemNames = taxedItems.map(item => item.name);
    const itemsToTransfer = allItems.filter(item => !taxedItemNames.includes(item.name));
    
    if (itemsToTransfer.length === 0) {
      console.log('No items to transfer to winner after tax');
      return;
    }
    
    let totalValueAdded = 0;
    const itemsAdded = [];
    
    // Add items to winner's inventory
    for (const item of itemsToTransfer) {
      // Skip winner's own items - they already have these
      if ((winnerId === game.creator && game.creatorItems.some(i => i.name === item.name)) ||
          (winnerId === game.joiner && game.joinerItems.some(i => i.name === item.name))) {
        continue;
      }
      
      // Add this item to winner's inventory
      await db.collection('inventories').updateOne(
        { robloxId: String(winnerId) },
        { 
          $push: { 
            [itemsField]: {
              ...item,
              addedAt: new Date(),
              instanceId: new ObjectId().toString()
            }
          },
          $inc: {
            [`stats.${statsField}.totalValue`]: item.value,
            [`stats.${statsField}.itemCount`]: 1,
            'stats.overall.totalValue': item.value
          }
        },
        { session }
      );
      
      itemsAdded.push(item);
      totalValueAdded += item.value;
    }
    
    console.log(`Transferred ${itemsAdded.length} items worth ${totalValueAdded} value to winner ${winnerId}`);
    return { itemsAdded, totalValueAdded };
  } catch (error) {
    console.error('Error transferring items to winner:', error);
    return { itemsAdded: [], totalValueAdded: 0 };
  }
};

// Update the join endpoint to include item transfer to the winner
app.post('/api/coinflip/join/:id', auth, async (req, res) => {
  let client;
  let session;
  try {
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    session = client.startSession();

    await session.withTransaction(async () => {
      // First get the game to verify it exists and is joinable
      const game = await db.collection('coinflips').findOne(
        { _id: new ObjectId(req.params.id) },
        { session }
      );

      if (!game) {
        throw new Error('Game not found');
      }

      if (game.state !== 'active') {
        throw new Error('Game is not active');
      }

      if (game.joiner) {
        throw new Error('Game already has a joiner');
      }

      // Check if user has the items in their inventory
      const inventory = await db.collection('inventories').findOne(
        { robloxId: String(req.session.userInfo.id) },
        { session }
      );

      if (!inventory) {
        throw new Error('Inventory not found');
      }

      // Verify items exist in inventory and check for duplicates
      const gameType = req.body.items[0]?.game?.toLowerCase() || 'ps99';
      const inventoryItems = gameType === 'mm2' ? inventory.mm2Items : inventory.ps99Items;
      const gameStats = gameType === 'mm2' ? 'mm2' : 'ps99';

      // Check for duplicate items in the request
      const itemNames = new Set();
      for (const item of req.body.items) {
        if (itemNames.has(item.name)) {
          throw new Error(`Duplicate item found: ${item.name}`);
        }
        itemNames.add(item.name);

        const inventoryItem = inventoryItems.find(i => i.name === item.name);
        if (!inventoryItem || inventoryItem.quantity < (item.quantity || 1)) {
          throw new Error(`Not enough ${item.name} in inventory`);
        }
      }

      // Calculate total value and check if it's within range
      const totalValue = req.body.items.reduce((sum, item) => sum + (item.value * (item.quantity || 1)), 0);
      if (totalValue < game.joinRangeMin || totalValue > game.joinRangeMax) {
        throw new Error('Items value is outside the acceptable range');
      }

      // Set joiner's side to opposite of creator's side
      const joinerSide = game.creatorSide === 'heads' ? 'tails' : 'heads';

      // Determine winner and winning side
      const { winningSide, winner } = determineWinner(game);
      const loser = winner === game.creator ? String(req.session.userInfo.id) : game.creator;

      // Update game with joiner and result
      const updatedGameData = {
        joiner: String(req.session.userInfo.id),
        joinerAvatar: req.session.userInfo.avatar,
        joinerItems: req.body.items,
        joinerSide: joinerSide,
        state: 'ended',
        winner: winner,
        winningSide: winningSide,
        endedAt: new Date(),
        totalValue: game.value + totalValue,
        itemIds: [
          ...game.itemIds,
          ...req.body.items.map(item => ({
            name: item.name,
            instanceId: item.instanceId || new ObjectId().toString()
          }))
        ]
      };
      
      const updateResult = await db.collection('coinflips').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updatedGameData },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to join game');
      }

      // Remove items from joiner's inventory
      for (const item of req.body.items) {
        const updateQuery = {
          $pull: { [`${gameStats}Items`]: { name: item.name } }
        };
        const removeResult = await db.collection('inventories').updateOne(
          { robloxId: String(req.session.userInfo.id) },
          updateQuery,
          { session }
        );

        if (removeResult.modifiedCount === 0) {
          throw new Error(`Failed to remove ${item.name} from inventory`);
        }
      }

      // After successful join and inventory update
      const updatedGame = await db.collection('coinflips').findOne(
        { _id: new ObjectId(req.params.id) },
        { session }
      );
      
      // Apply tax from the winner
      const winnerItems = winner === game.creator ? game.creatorItems : req.body.items;
      
      // Apply tax and get taxed items
      const { taxedItems } = await handleCoinflipTax(
        updatedGame,
        winner,
        winnerItems,
        session,
        db
      );
      
      // Transfer remaining items to winner (excluding taxed items)
      await transferItemsToWinner(
        updatedGame,
        winner,
        taxedItems,
        session,
        db
      );

      // Emit Socket.IO events for real-time updates
      if (io) {
        // Emit game update
        io.emit('coinflip_update', updatedGame);
        
        // Emit game end event with winner information
        io.emit('coinflip_end', updatedGame);

        // Emit value updates
        io.emit('user_value_update', {
          userId: String(req.session.userInfo.id),
          totalValue: inventory.stats.overall.totalValue - totalValue
        });

        // Update total coinflip value
        const allGames = await db.collection('coinflips').find({}).toArray();
        const totalCoinflipValue = allGames.reduce((sum, game) => sum + (game.value || 0), 0);
        io.emit('value_update', {
          coinflipValue: totalCoinflipValue
        });
      }

      // Update stats
      const winAmount = updatedGame.value * 2; // Total pot
      const taxAmount = Math.floor(winAmount * 0.15); // 15% tax
      await updateStatsOnGameEnd(db, updatedGame, winner, session);

      res.json({ 
        success: true,
        winner: winner,
        winningSide: winningSide
      });
    });
  } catch (error) {
    console.error('Error joining coinflip:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    if (session) {
      await session.endSession();
    }
    if (client) {
      await client.close();
    }
  }
});

// Get user by ID
app.get('/api/users/:id', cacheUser, async (req, res) => {
  try {
    const projection = {
      username: 1,
      avatar: 1,
      displayName: 1,
      _id: 0
    };

    const user = await db.collection('users').findOne(
      { robloxId: req.params.id },
      { projection }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response = {
      username: user.username,
      avatar: user.avatar,
      displayName: user.displayName
    };

    // Cache the response
    cache.set(`user_${req.params.id}`, response);

    res.json(response);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active coinflip games
app.get('/api/coinflip/games', async (req, res) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');

    const games = await db.collection('coinflips')
      .find({ state: 'active' })
      .sort({ value: -1 })
      .toArray();

    res.json({ success: true, games });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Get user avatar by ID
app.get('/api/users/:id/avatar', async (req, res) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    const user = await db.collection('users').findOne({ robloxId: req.params.id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return just the avatar URL
        res.json({
      success: true,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Error fetching user avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
});

// Add history tracking to handleCoinflipResult function
async function handleCoinflipResult(game, winner, winnerSide) {
  // ... existing code ...
  
  // Add to game history
  try {
    const gameHistory = new GameHistory({
      gameId: game.id,
      gameType: 'coinflip',
      creator: {
        id: game.creator.id,
        name: game.creator.name,
        avatar: game.creator.avatar
      },
      joiner: {
        id: game.joiner.id,
        name: game.joiner.name,
        avatar: game.joiner.avatar
      },
      creatorSide: game.creatorSide,
      creatorItems: game.creatorItems.map(item => ({
        instanceId: item.instanceId,
        name: item.name,
        image: item.image,
        value: item.value
      })),
      joinerItems: game.joinerItems.map(item => ({
        instanceId: item.instanceId,
        name: item.name,
        image: item.image,
        value: item.value
      })),
      totalValue: game.value,
      winner: winner.id,
      winnerSide: winnerSide,
      tax: taxAmount,
      state: 'completed',
      completedAt: new Date()
    });
    
    await gameHistory.save();
  } catch (error) {
    console.error('Error saving game history:', error);
  }
  
  // ... rest of existing code ...
}

// Add API endpoint for getting user game history
app.get('/api/coinflip/history', auth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = req.user.robloxId;
    
    // Find games where the user was either creator or joiner
    const games = await GameHistory.find({
      $or: [
        { 'creator.id': userId },
        { 'joiner.id': userId }
      ]
    })
    .sort({ createdAt: -1 }) // Sort by newest first
    .limit(10);             // Get last 10 games
    
    return res.json({ games });
  } catch (error) {
    console.error('Error fetching game history:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Add API endpoint for getting global game history (for admin or leaderboard)
app.get('/api/coinflip/history/global', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const games = await GameHistory.find({ state: 'completed' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await GameHistory.countDocuments({ state: 'completed' });
    
    return res.json({
      games,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching global game history:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get active announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({ 
      active: true,
      showOnSite: true 
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(5); // Only show last 5 active announcements
    
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new API endpoint for huge pet images
app.get('/api/ps99/huge-image/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    
    // Find the item in ps99items collection
    const item = await db.collection('ps99items').findOne({ name });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // If it's a huge pet, try to get the image from Big Games API
    if (item.name.includes('HUGE')) {
      try {
        const response = await axios.get('https://biggamesapi.io/api/collection/Pets');
        const pets = response.data.data;
        
        // Find matching pet (try different name variations)
        let matchingPet = null;
        const searchName = item.name
          .replace('GOLDEN ', '')
          .replace('RAINBOW ', '')
          .replace('HUGE ', '');
          
        for (const pet of pets) {
          if (pet.category === "Huge" && 
              (pet.configData.name.includes(searchName) || 
               searchName.includes(pet.configData.name))) {
            matchingPet = pet;
            break;
          }
        }
        
        if (matchingPet) {
          let imageUrl;
          if (item.name.startsWith('GOLDEN') && matchingPet.configData.goldenThumbnail) {
            const goldenAssetId = matchingPet.configData.goldenThumbnail.replace('rbxassetid://', '');
            imageUrl = `https://www.roblox.com/asset-thumbnail/image?assetId=${goldenAssetId}&width=420&height=420&format=png`;
          } else {
            const assetId = matchingPet.configData.thumbnail.replace('rbxassetid://', '');
            imageUrl = `https://www.roblox.com/asset-thumbnail/image?assetId=${assetId}&width=420&height=420&format=png`;
          }
          
          return res.json({ success: true, imageUrl });
        }
      } catch (apiError) {
        console.error('Error fetching from Big Games API:', apiError);
      }
    }
    
    // Fallback to default image if no huge pet image found
    res.json({ success: true, imageUrl: item.image });
    
  } catch (error) {
    console.error('Error getting huge pet image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// The "catchall" handler: for any request that doesn't match the ones above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    const adminUrl = `https://bloxroll-development.onrender.com/admin-panel/BLOXROLL-SECURE-ADMIN-PANEL-ACCESS-KEY-AISJINANSUA_AAAAAAAAANaaaaaas-DEVELOPMENT-SERVER-2024-AUTHORIZED-ACCESS-ONLY-DO-NOT-SHARE`;
    console.log('\n\x1b[33m%s\x1b[0m', `[ADMIN] ⚠️ SECURE ADMIN PANEL URL:`);
    console.log('\x1b[32m%s\x1b[0m', `${adminUrl}\n`);
}); 

// When tax is given out
async function handleTaxGiveaway(amount, recipients) {
  try {
    // Emit announcement to all connected clients
    io.emit('new_announcement', {
      content: `🎉 ${formatValue(amount)} in tax has been given out to ${recipients.length} lucky winners!`,
      type: 'success',
      timestamp: new Date()
    });
    
    // ... rest of giveaway logic ...
  } catch (error) {
    console.error('Error in tax giveaway:', error);
  }
}

// Add these functions for stats calculation
async function calculateCoinflipStats() {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Get current hour and day boundaries
    const currentHourStart = Math.floor(now / 3600) * 3600;
    const nextHourStart = currentHourStart + 3600;
    
    const currentDayStart = Math.floor(now / 86400) * 86400;
    const nextDayStart = currentDayStart + 86400;
    
    // Get total active games count
    const totalGames = await Coinflip.countDocuments({ state: 'active' });
    
    // Get total value from active games
    const activeGames = await Coinflip.find({ state: 'active' });
    const activeGamesValue = activeGames.reduce((sum, game) => sum + game.value, 0);
    
    return {
      totalGames,
      totalValue: activeGamesValue,
      biggestWin: 0,
      taxCollected: 0,
      hourlyResetTime: nextHourStart,    // Next hour boundary
      dailyResetTime: nextDayStart       // Next day boundary
    };
  } catch (error) {
    console.error('Error calculating coinflip stats:', error);
    return {
      totalGames: 0,
      totalValue: 0,
      biggestWin: 0,
      taxCollected: 0,
      hourlyResetTime: Math.floor(Date.now() / 1000) + 3600,
      dailyResetTime: Math.floor(Date.now() / 1000) + 86400
    };
  }
}

// Add this to your socket.io connection handler
io.on('connection', async (socket) => {
  // ... your existing socket setup ...

  // Send initial stats
  try {
    const stats = await calculateCoinflipStats();
    socket.emit('coinflip_stats', stats);
  } catch (error) {
    console.error('Error sending initial stats:', error);
  }

  // Update stats on game creation
  socket.on('coinflip_created', async (game) => {
    try {
      const stats = await calculateCoinflipStats();
      io.emit('coinflip_stats', stats);
    } catch (error) {
      console.error('Error updating stats after game creation:', error);
    }
  });

  // Update stats on game join/completion
  socket.on('game_joined', async (gameData) => {
    try {
      // Immediately update stats when a game is joined
      const stats = await calculateCoinflipStats();
      io.emit('coinflip_stats', stats);
    } catch (error) {
      console.error('Error updating stats after game join:', error);
    }
  });

  // Update stats on game completion
  socket.on('coinflip_completed', async (gameId) => {
    try {
      // Get the complete game data
      const game = await db.collection('coinflips').findOne({ _id: new ObjectId(gameId) });
      if (!game) return;

      // Get both users' info
      const [joinerInfo, creatorInfo] = await Promise.all([
        db.collection('users').findOne({ robloxId: String(game.joiner) }),
        db.collection('users').findOne({ robloxId: String(game.creator) })
      ]);

      // Get joiner's avatar from Roblox API
      let joinerAvatar;
      try {
        const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${game.joiner}&size=150x150&format=Png`);
        if (response.data?.data?.[0]?.imageUrl) {
          joinerAvatar = response.data.data[0].imageUrl;
        }
      } catch (error) {
        console.error('Error fetching joiner avatar:', error);
      }

      // Use the API avatar, or fallback to stored avatar, or default
      joinerAvatar = joinerAvatar || joinerInfo?.avatar || '/default_avatar.png';

      // Emit game_ended event with complete info
      io.emit('game_ended', {
        gameId: game._id,
        winner: game.winner,
        winningSide: game.winningSide,
        joinerAvatar: joinerAvatar,
        joinerName: joinerInfo?.username || 'Unknown',
        creatorAvatar: creatorInfo?.avatar || game.creatorAvatar || '/default_avatar.png',
        creatorName: creatorInfo?.username || 'Unknown',
        creatorSide: game.creatorSide,
        value: game.value,
        totalValue: game.totalValue,
        creatorItems: game.creatorItems,
        joinerItems: game.joinerItems,
        state: 'ended'
      });

      // Immediately update stats after game completion
      const stats = await calculateCoinflipStats();
      io.emit('coinflip_stats', stats);

      // Clear active games cache
      activeGamesCache.clear();
    } catch (error) {
      console.error('Error in coinflip_completed event:', error);
    }
  });

  // Add a listener specifically for game_ended
  socket.on('game_ended', async (gameData) => {
    try {
      // Immediately update stats when a game ends
      const stats = await calculateCoinflipStats();
      io.emit('coinflip_stats', stats);
    } catch (error) {
      console.error('Error updating stats after game ended:', error);
    }
  });

  // Remove the periodic stats refresh - it's unnecessary load
  // Only update stats on relevant events (creation, join, completion)

  // ... rest of your socket handlers ...
}); 

// Get current user ID endpoint
app.get('/api/user/id', (req, res) => {
  try {
    if (!req.session.userInfo) {
      return res.status(401).json({ 
        success: false,
        message: 'Not logged in'
      });
    }

    res.json({
      success: true,
      id: req.session.userInfo.id
    });
  } catch (error) {
    console.error('Error getting user ID:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
}); 

// Game cancellation endpoint
app.post('/api/coinflip/:gameId/cancel', async (req, res) => {
  let client;
  let session;
  
  try {
    // Get user from session
    if (!req.session.userInfo) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const gameId = req.params.gameId;
    if (!gameId || !ObjectId.isValid(gameId)) {
      return res.status(400).json({ success: false, message: 'Invalid game ID' });
    }

    // Connect to database and start transaction
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    session = client.startSession();
    
    let result;
    
    await session.withTransaction(async () => {
      // First find the game to make sure it exists and can be cancelled
      const game = await db.collection('coinflips').findOne(
        { 
          _id: new ObjectId(gameId),
          state: 'active',
          creator: String(req.session.userInfo.id),
          joiner: null // Ensure no joiner
        },
        { session }
      );

      if (!game) {
        throw new Error('Game not found or cannot be canceled');
      }

      // First check if inventory exists
      const inventory = await db.collection('inventories').findOne(
        { robloxId: String(req.session.userInfo.id) },
        { session }
      );

      if (!inventory) {
        throw new Error('User inventory not found');
      }

      // Prepare items to return
      const itemsToReturn = game.creatorItems.map(item => ({
        instanceId: new ObjectId().toString(),
        name: item.name,
        value: item.value,
        quantity: 1,
        image: item.image,
        game: item.game || "ps99",
        addedAt: new Date()
      }));

      // Calculate total value being returned
      const totalValue = game.creatorItems.reduce((sum, item) => sum + item.value, 0);

      // Update inventory with returned items
      const updateResult = await db.collection('inventories').updateOne(
        { robloxId: String(req.session.userInfo.id) },
        { 
          $push: { 
            ps99Items: { 
              $each: itemsToReturn 
            } 
          },
          $inc: {
            'stats.ps99.itemCount': itemsToReturn.length,
            'stats.ps99.totalValue': totalValue,
            'stats.overall.totalValue': totalValue
          }
        },
        { session }
      );

      if (updateResult.modifiedCount !== 1) {
        throw new Error('Failed to update inventory');
      }

      // Update game state
      await db.collection('coinflips').updateOne(
        { _id: new ObjectId(gameId) },
        { 
          $set: {
            state: 'canceled',
            endedAt: new Date()
          }
        },
        { session }
      );

      // Get updated inventory for total value
      const updatedInventory = await db.collection('inventories').findOne(
        { robloxId: String(req.session.userInfo.id) },
        { session }
      );

      // Update coinflip stats
      await db.collection('stats').updateOne(
        { type: 'coinflip' },
        { 
          $inc: { 
            totalGames: -1,
            totalWagered: -totalValue 
          },
          $set: { lastUpdated: new Date() }
        },
        { session }
      );

      result = {
        gameId: gameId,
        totalValue: totalValue,
        newUserValue: updatedInventory.stats.overall.totalValue
      };
    });

    // After successful transaction, emit socket events
    if (io) {
      // Emit game cancellation event
      io.emit('game_cancelled', {
        gameId: result.gameId,
        userId: String(req.session.userInfo.id)
      });

      // Emit user value update
      io.emit('user_value_update', {
        userId: String(req.session.userInfo.id),
        totalValue: result.newUserValue
      });

      // Emit active games update
      const activeGames = await db.collection('coinflips')
        .find({ state: 'active' })
        .sort({ value: -1 })
        .toArray();
      
      io.emit('active_games_update', activeGames);

      // Clear cache
      cache.del('active_coinflip_games');
    }

    res.json({ success: true, message: 'Game canceled successfully' });

  } catch (error) {
    console.error('Error canceling game:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error'
    });
  } finally {
    if (session) await session.endSession();
    if (client) await client.close();
  }
}); 

// Get user avatar endpoint
app.get('/api/users/:userId/avatar', async (req, res) => {
  let client;
  try {
    const { userId } = req.params;
    
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('test');
    
    // Try to get user from database
    const user = await db.collection('users').findOne(
      { robloxId: String(userId) },
      { projection: { avatar: 1, username: 1, displayName: 1 } }
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      avatar: user.avatar,
      username: user.username,
      displayName: user.displayName
    });
    
  } catch (error) {
    console.error('Error fetching user avatar:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  } finally {
    if (client) await client.close();
  }
}); 

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Export functions for use in other modules
module.exports = {
  calculateCoinflipStats
};