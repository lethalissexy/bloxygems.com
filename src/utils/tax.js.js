const { formatValue } = require('./formatters');

function calculateTax(items) {
  // Input validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log('No items provided for tax calculation');
    return { taxedItems: [], totalTaxValue: 0, taxPercentage: 0 };
  }

  // Ensure all items have valid values
  const validItems = items.filter(item => {
    const value = Number(item.value);
    if (isNaN(value) || value <= 0) {
      console.log(`Invalid value for item ${item.name}: ${item.value}`);
      return false;
    }
    return true;
  });

  if (validItems.length === 0) {
    console.log('No valid items found for tax calculation');
    return { taxedItems: [], totalTaxValue: 0, taxPercentage: 0 };
  }

  const totalItemsValue = validItems.reduce((sum, item) => sum + Number(item.value), 0);
  
  // Tax rate configuration
  const targetTaxRate = 0.12; // 12%
  const maxTaxRate = 0.15;    // 15%
  const targetTaxAmount = totalItemsValue * targetTaxRate;
  const maxTaxAmount = totalItemsValue * maxTaxRate;
  
  console.log(`Total items value: ${formatValue(totalItemsValue)}`);
  console.log(`Target tax amount (12%): ${formatValue(targetTaxAmount)}`);
  console.log(`Maximum tax amount (15%): ${formatValue(maxTaxAmount)}`);
  
  // Sort items by value (ascending) for optimal tax selection
  const sortedItems = [...validItems].sort((a, b) => Number(a.value) - Number(b.value));
  
  // Check if smallest item would exceed max tax rate
  if (Number(sortedItems[0].value) / totalItemsValue > maxTaxRate) {
    console.log(`Smallest item (${formatValue(sortedItems[0].value)}) would exceed maximum tax rate of 15%. No tax applied.`);
    return { taxedItems: [], totalTaxValue: 0, taxPercentage: 0 };
  }
  
  const taxedItems = [];
  let totalTaxValue = 0;
  let remainingTargetTax = targetTaxAmount;
  
  // Select items for tax, prioritizing optimal combinations
  for (const item of sortedItems) {
    const itemValue = Number(item.value);
    
    // Check if adding this item would exceed max tax rate
    if ((totalTaxValue + itemValue) / totalItemsValue > maxTaxRate) {
      console.log(`Adding ${item.name} would exceed max tax rate. Stopping here.`);
      break;
    }
    
    // Check if this item gets us closer to target tax without exceeding it
    if (totalTaxValue + itemValue <= maxTaxAmount) {
      taxedItems.push({
        ...item,
        taxReason: 'house_edge'
      });
      totalTaxValue += itemValue;
      remainingTargetTax -= itemValue;
      console.log(`Selected ${item.name} (${formatValue(itemValue)}) for tax, total: ${formatValue(totalTaxValue)}`);
      
      if (totalTaxValue >= targetTaxAmount) {
        console.log('Reached target tax amount');
          break;
      }
    }
  }
  
  const taxPercentage = (totalTaxValue / totalItemsValue) * 100;
  
  console.log(`Final tax: ${taxedItems.length} items, value: ${formatValue(totalTaxValue)} (${taxPercentage.toFixed(2)}%)`);
  
  return {
    taxedItems: taxedItems,
    totalTaxValue: totalTaxValue,
    taxPercentage: taxPercentage,
    remainingValue: totalItemsValue - totalTaxValue
  };
}

function formatTaxMessage(game, taxResult) {
  if (!game || !taxResult) {
    return 'Invalid game or tax data';
  }

  const winner = game.winner === game.creator ? 'Creator' : 'Joiner';
  const loser = game.winner === game.creator ? 'Joiner' : 'Creator';
  const winnerName = game.winner === game.creator ? game.creatorName : game.joinerName;
  const loserName = game.winner === game.creator ? game.joinerName : game.creatorName;
  
  let message = `🎲 **Coinflip Game Completed**\n\n`;
  message += `**${winner}** (${winnerName}) vs **${loser}** (${loserName})\n`;
  message += `Total Pot: R$${formatValue(game.value * 2)}\n\n`;
  
  if (taxResult.taxedItems.length > 0) {
  message += `**Tax Collected:**\n`;
  taxResult.taxedItems.forEach(item => {
    message += `• ${item.name} - R$${formatValue(item.value)}\n`;
  });
  
    message += `\n**Total Tax:** R$${formatValue(taxResult.totalTaxValue)} (${taxResult.taxPercentage.toFixed(2)}%)\n`;
    message += `**Winner Receives:** R$${formatValue(taxResult.remainingValue)}`;
  } else {
    message += `**No tax collected**\nWinner receives full pot: R$${formatValue(game.value * 2)}`;
  }
  
  return message;
}

module.exports = {
  calculateTax,
  formatTaxMessage
}; 