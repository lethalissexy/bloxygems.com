export const formatValue = (value) => {
  // Ensure value is a number and handle potential null/undefined values
  if (value === null || value === undefined) return '0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(numValue)) return '0';
  
  // Log the exact value we're formatting for debugging
  console.log(`Formatting value: ${value} (${typeof value})`);
  
  // Format based on magnitude
  if (numValue >= 1_000_000_000_000) {
    return `${(numValue / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (numValue >= 1_000_000_000) {
    return `${(numValue / 1_000_000_000).toFixed(2)}B`;
  }
  if (numValue >= 1_000_000) {
    return `${(numValue / 1_000_000).toFixed(2)}M`;
  }
  if (numValue >= 1_000) {
    return `${(numValue / 1_000).toFixed(2)}K`;
  }
  return numValue.toFixed(2);
};

// Add formatValueCompact function for smaller displays
export const formatValueCompact = (value) => {
  // Ensure value is a number and handle potential null/undefined values
  if (value === null || value === undefined) return '0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(numValue)) return '0';
  
  // Format based on magnitude, with shorter decimals for UI space constraints
  if (numValue >= 1_000_000_000_000) {
    return `${(numValue / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (numValue >= 1_000_000_000) {
    return `${(numValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (numValue >= 1_000_000) {
    return `${(numValue / 1_000_000).toFixed(1)}M`;
  }
  if (numValue >= 1_000) {
    return `${(numValue / 1_000).toFixed(1)}K`;
  }
  return Math.round(numValue).toString();
};

export const formatValueWithSuffix = (value) => {
  // Ensure value is a number
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(numValue) || numValue === 0) return '0';
  
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const tier = Math.floor(Math.log10(Math.abs(numValue)) / 3);
  
  if (tier === 0) return numValue.toFixed(2);
  if (tier >= suffixes.length) return numValue.toExponential(2); // For extremely large numbers
  
  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = numValue / scale;
  
  // Format with one decimal place if not whole number
  return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}${suffix}`;
};

export const formatStatsValue = (value) => {
  return `💎 ${formatValueWithSuffix(value)}`;
};

export const formatGamesCount = (count) => {
  return `🎮 ${count.toLocaleString()}`;
};

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Add formatTimeAgo function for relative time display
export const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}; 