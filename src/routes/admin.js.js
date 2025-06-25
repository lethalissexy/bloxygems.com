const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const MM2Item = require('../models/MM2Item');
const PS99Item = require('../models/PS99Item');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const itemService = require('../services/itemService');
const { isAdmin } = require('../middleware/auth');
const Withdraw = require('../models/Withdraw');

// Get admin credentials from server
const { adminCredentials } = require('../../server');

// In-memory storage for failed attempts
let failedAttempts = new Map();

// Rate limiting middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// IP-based attempt tracking
function trackAttempt(ip) {
    const attempts = failedAttempts.get(ip) || 0;
    failedAttempts.set(ip, attempts + 1);
    
    // If too many attempts, block for longer period
    if (attempts >= 5) {
        return false;
    }
    return true;
}

// Middleware to check if request is coming from valid admin URL
function validateAdminUrl(req, res, next) {
    const adminPathFromUrl = req.path.split('/')[1];
    const currentAdminPath = adminCredentials.adminPath();
    
    if (adminPathFromUrl === currentAdminPath) {
        next();
    } else {
        res.status(404).send('Not Found');
    }
}

// Apply rate limiting and URL validation to all admin routes
router.use(apiLimiter);
router.use(validateAdminUrl);

// Serve admin panel only on current dynamic URL
router.get('*', (req, res, next) => {
    const adminPathFromUrl = req.path.split('/')[1];
    const currentAdminPath = adminCredentials.adminPath();
    
    if (adminPathFromUrl === currentAdminPath) {
        res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
    } else {
        next();
    }
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    // Check if the request is coming from the correct admin path
    const requestPath = req.originalUrl.split('/api/admin/')[1];
    if (!requestPath || !requestPath.startsWith(adminCredentials.adminPath)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

// Get all users
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'username displayName robloxId');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Get items by game
router.get('/:game/items', isAdmin, async (req, res) => {
    try {
        const { game } = req.params;
        let items = [];

        if (game === 'mm2') {
            items = await MM2Item.find().sort({ value: -1, name: 1 });
        } else if (game === 'ps99') {
            items = await PS99Item.find().sort({ value: -1, name: 1 });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid game type' });
        }

        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch items' });
    }
});

// Get user's inventory
router.get('/inventory/:userId/:game', isAdmin, async (req, res) => {
    try {
        const { userId, game } = req.params;

        // Validate game type
        if (!['mm2', 'ps99'].includes(game)) {
            return res.status(400).json({ success: false, message: 'Invalid game type' });
        }

        // Find or create inventory
        let inventory = await Inventory.findOne({ userId, game });
        if (!inventory) {
            inventory = new Inventory({ userId, game, items: [], stats: { totalItems: 0, totalValue: 0 } });
            await inventory.save();
        }

        res.json({
            success: true,
            items: inventory.items,
            stats: inventory.stats
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
    }
});

// Add items to inventory
router.post('/inventory/add', isAdmin, async (req, res) => {
    try {
        const { userId, items, game } = req.body;

        // Validate required fields
        if (!userId || !items || !game || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Validate game type
        if (!['mm2', 'ps99'].includes(game)) {
            return res.status(400).json({ success: false, message: 'Invalid game type' });
        }

        // Find or create inventory
        let inventory = await Inventory.findOne({ userId, game });
        if (!inventory) {
            inventory = new Inventory({ userId, game, items: [], stats: { totalItems: 0, totalValue: 0 } });
        }

        // Validate items and update inventory
        const ItemModel = game === 'mm2' ? MM2Item : PS99Item;
        const validItems = [];
        let totalValue = 0;

        for (const item of items) {
            // Verify item exists in database
            const dbItem = await ItemModel.findOne({ id: item.id });
            if (!dbItem) {
                console.warn(`Item not found in database: ${item.id}`);
                continue;
            }

            // Create item instance with unique ID
            const itemInstance = {
                ...item,
                instanceId: item.instanceId || crypto.randomUUID(),
                addedAt: item.addedAt || new Date().toISOString(),
                source: item.source || 'admin'
            };

            // Check for duplicate instanceId
            if (inventory.items.some(i => i.instanceId === itemInstance.instanceId)) {
                console.warn(`Duplicate instanceId found: ${itemInstance.instanceId}`);
                continue;
            }

            validItems.push(itemInstance);
            totalValue += dbItem.value;
        }

        // Update inventory
        inventory.items.push(...validItems);
        inventory.stats.totalItems = inventory.items.length;
        inventory.stats.totalValue = inventory.items.reduce((sum, item) => sum + item.value, 0);

        await inventory.save();

        res.json({
            success: true,
            message: `Added ${validItems.length} items to inventory`,
            inventory: {
                items: inventory.items,
                stats: inventory.stats
            }
        });
    } catch (error) {
        console.error('Error adding items to inventory:', error);
        res.status(500).json({ success: false, message: 'Failed to add items to inventory' });
    }
});

// Remove items from inventory
router.post('/inventory/remove', isAdmin, async (req, res) => {
    try {
        const { userId, instanceIds, game } = req.body;

        // Validate required fields
        if (!userId || !instanceIds || !game || !Array.isArray(instanceIds)) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Validate game type
        if (!['mm2', 'ps99'].includes(game)) {
            return res.status(400).json({ success: false, message: 'Invalid game type' });
        }

        // Find inventory
        const inventory = await Inventory.findOne({ userId, game });
        if (!inventory) {
            return res.status(404).json({ success: false, message: 'Inventory not found' });
        }

        // Remove items and update stats
        const initialCount = inventory.items.length;
        inventory.items = inventory.items.filter(item => !instanceIds.includes(item.instanceId));
        
        // Update stats
        inventory.stats.totalItems = inventory.items.length;
        inventory.stats.totalValue = inventory.items.reduce((sum, item) => sum + item.value, 0);

        await inventory.save();

        const removedCount = initialCount - inventory.items.length;
        res.json({
            success: true,
            message: `Removed ${removedCount} items from inventory`,
            inventory: {
                items: inventory.items,
                stats: inventory.stats
            }
        });
    } catch (error) {
        console.error('Error removing items from inventory:', error);
        res.status(500).json({ success: false, message: 'Failed to remove items from inventory' });
    }
});

// Get all withdrawals
router.get('/withdrawals', isAdmin, async (req, res) => {
    try {
        const withdrawals = await Withdraw.find()
            .sort({ createdAt: -1 })
            .lean();

        // The withdrawals already have username field, no need to populate
        res.json(withdrawals);
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
});

// Mark withdrawal as paid
router.post('/withdrawals/:id/pay', isAdmin, async (req, res) => {
    try {
        const withdrawal = await Withdraw.findById(req.params.id);
        
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        if (withdrawal.status === 'paid') {
            return res.status(400).json({ error: 'Withdrawal is already marked as paid' });
        }

        withdrawal.status = 'paid';
        await withdrawal.save();

        res.json({ success: true, message: 'Withdrawal marked as paid' });
    } catch (error) {
        console.error('Error marking withdrawal as paid:', error);
        res.status(500).json({ error: 'Failed to mark withdrawal as paid' });
    }
});

module.exports = router; 