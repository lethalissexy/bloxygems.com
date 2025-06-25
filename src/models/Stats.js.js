const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  biggestWin: {
    type: Number,
    default: 0
  },
  taxPool: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Function to check and update biggest win if new amount is larger
statsSchema.statics.checkAndUpdateBiggestWin = async function(newWinAmount) {
  try {
    console.log(`\x1b[33m%s\x1b[0m`, `Checking biggest win: ${newWinAmount}`);
    
    // Find existing stats or create new if none exists
    let stats = await this.findOne();
    if (!stats) {
      console.log(`No stats found, creating new with biggest win: ${newWinAmount}`);
      stats = await this.create({
        biggestWin: newWinAmount,
        taxPool: 0
      });
      return {
        updated: true,
        oldBiggestWin: 0,
        newBiggestWin: newWinAmount
      };
    }

    // Compare with current biggest win
    console.log(`Current biggest win in DB: ${stats.biggestWin}, new potential win: ${newWinAmount}`);
    
    if (newWinAmount > stats.biggestWin) {
      const oldBiggestWin = stats.biggestWin;
      stats.biggestWin = newWinAmount;
      
      console.log(`\x1b[32m%s\x1b[0m`, `✅ UPDATING biggest win from ${oldBiggestWin} to ${newWinAmount}`);
      
      await stats.save();
      
      // Verify update was successful
      const verifiedStats = await this.findOne();
      console.log(`Verified biggest win after update: ${verifiedStats.biggestWin}`);
      
      return {
        updated: true,
        oldBiggestWin: oldBiggestWin,
        newBiggestWin: newWinAmount
      };
    }

    return {
      updated: false,
      oldBiggestWin: stats.biggestWin,
      newBiggestWin: stats.biggestWin
    };
  } catch (error) {
    console.error('Error updating biggest win:', error);
    throw error;
  }
};

// Static method to update tax pool
statsSchema.statics.updateTaxPool = async function(amount) {
  try {
    console.log(`\x1b[33m%s\x1b[0m`, `Updating tax pool by adding: ${amount}`);
    
    const stats = await this.findOne() || await this.create({});
    const oldTaxPool = stats.taxPool || 0;
    
    stats.taxPool = (stats.taxPool || 0) + amount;
    
    console.log(`\x1b[32m%s\x1b[0m`, `✅ UPDATING tax pool from ${oldTaxPool} to ${stats.taxPool}`);
    
    await stats.save();
    
    // Verify update was successful
    const verifiedStats = await this.findOne();
    console.log(`Verified tax pool after update: ${verifiedStats.taxPool}`);
    
    return stats;
  } catch (error) {
    console.error('Error updating tax pool:', error);
    throw error;
  }
};

// Add a new static method to log stats updates for debugging
statsSchema.statics.logStatsUpdate = async function(updatedStats) {
  try {
    console.log('Stats update logged:');
    console.log('🎮 Total Games:', updatedStats.totalGames);
    console.log('💎 Total Value:', updatedStats.totalValue);
    console.log('🏆 Biggest Win:', updatedStats.biggestWin);
    console.log('📊 Tax Collected:', updatedStats.taxCollected);
    console.log('⏰ Hourly Reset:', new Date(updatedStats.hourlyResetTime * 1000).toLocaleString());
    console.log('📅 Daily Reset:', new Date(updatedStats.dailyResetTime * 1000).toLocaleString());
    return true;
  } catch (error) {
    console.error('Error logging stats update:', error);
    return false;
  }
};

const Stats = mongoose.model('Stats', statsSchema);

module.exports = Stats; 