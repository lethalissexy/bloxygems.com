import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatValue, formatValueCompact } from '../utils/formatters';
import toast from 'react-hot-toast';
import DepositModal from './DepositModal';

const Wallet = ({ isOpen, onClose, userInfo, onInventoryUpdate }) => {
  const [inventory, setInventory] = useState({
    mm2Items: [],
    ps99Items: [],
    stats: {
      mm2: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
      ps99: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
      overall: { totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGame, setSelectedGame] = useState('ps99');
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('value');
  const [inventoryStats, setInventoryStats] = useState({
    totalValue: 0,
    itemCount: 0,
    mm2Value: 0,
    ps99Value: 0
  });
  const [showDepositModal, setShowDepositModal] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/current');
      if (response.data.user) {
        const mm2Items = response.data.inventory.mm2Items || [];
        const ps99Items = response.data.inventory.ps99Items || [];
        
        setInventory({
          mm2Items,
          ps99Items,
          stats: response.data.inventory.stats || {
            mm2: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
            ps99: { itemCount: 0, totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 },
            overall: { totalValue: 0, profit: 0, wager: 0, gamesPlayed: 0, wins: 0, losses: 0 }
          }
        });
        
        // Calculate inventory values directly from items
        calculateInventoryStats(mm2Items, ps99Items);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen]);
  
  const calculateInventoryStats = (mm2Items = [], ps99Items = []) => {
    const mm2Value = mm2Items.reduce((total, item) => total + Math.max(0, (item.value || 0)), 0);
    const ps99Value = ps99Items.reduce((total, item) => total + Math.max(0, (item.value || 0)), 0);
    const totalItems = mm2Items.length + ps99Items.length;
    const totalValue = mm2Value + ps99Value;
    
    setInventoryStats({
      totalValue: Math.max(0, totalValue),
      itemCount: totalItems,
      mm2Value: Math.max(0, mm2Value),
      ps99Value: Math.max(0, ps99Value)
    });
  };

  // When selected items change, recalculate their total value
  useEffect(() => {
    if (selectedItems.length > 0) {
      const selectedValue = selectedItems.reduce((total, item) => total + (item.value || 0), 0);
      console.log(`Selected items total value: ${formatValue(selectedValue)}`);
    }
  }, [selectedItems]);

  const handleSelectItem = (item) => {
    // Prevent selecting duplicate instance IDs
    const isDuplicate = selectedItems.some(selectedItem => selectedItem.instanceId === item.instanceId);
    
    if (isDuplicate) {
      // If already selected, remove it
      setSelectedItems(selectedItems.filter(i => i.instanceId !== item.instanceId));
    } else {
      // Before adding, do one final check to prevent duplicates
      const existingInstanceIds = new Set(selectedItems.map(i => i.instanceId));
      if (!existingInstanceIds.has(item.instanceId)) {
        setSelectedItems([...selectedItems, item]);
      } else {
        toast.error('Cannot select duplicate items');
      }
    }
  };

  const handleSelectAll = () => {
    const currentItems = selectedGame === 'ps99' ? inventory.ps99Items : inventory.mm2Items;
    
    // When selecting all, ensure no duplicate instance IDs
    const uniqueItems = [];
    const seenInstanceIds = new Set();
    
    currentItems.forEach(item => {
      if (!seenInstanceIds.has(item.instanceId)) {
        uniqueItems.push(item);
        seenInstanceIds.add(item.instanceId);
      }
    });
    
    setSelectedItems(prev => 
      prev.length === uniqueItems.length ? [] : uniqueItems
    );
  };

  const handleWithdraw = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to withdraw');
      return;
    }

    // Ask for confirmation using toast
    toast((t) => (
      <div className="flex flex-col gap-3 p-6 bg-[#0d1117] border-2 border-yellow-500 rounded-lg shadow-2xl min-w-[300px]">
        <div className="text-white text-center">
          <div className="text-xl font-bold mb-2">Confirm Withdrawal</div>
          <div className="text-gray-300 mb-2">
            Are you sure you want to withdraw {selectedItems.length} items?
          </div>
          <div className="text-2xl font-bold text-yellow-400 mb-4">
            💎 {formatValueCompact(calculateTotalValue())}
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button
            className="px-6 py-3 bg-[#00c853] text-white rounded-lg hover:bg-[#00e676] transition-all duration-200 font-bold text-lg shadow-lg shadow-green-900/20 hover:shadow-green-900/40 min-w-[120px] transform hover:scale-105"
            onClick={() => {
              toast.dismiss(t.id);
              processWithdraw();
            }}
          >
            Confirm
          </button>
          <button
            className="px-6 py-3 bg-[#d32f2f] text-white rounded-lg hover:bg-[#f44336] transition-all duration-200 font-bold text-lg shadow-lg shadow-red-900/20 hover:shadow-red-900/40 min-w-[120px] transform hover:scale-105"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
        </div>
      </div>
    ), { 
      duration: 10000,
      position: 'top-center',
      style: {
        background: 'transparent',
        boxShadow: 'none',
        padding: '20px',
      }
    });
  };

  const processWithdraw = async () => {
    try {
      setLoading(true);

      // Check for duplicate instance IDs before proceeding
      const instanceIds = selectedItems.map(item => item.instanceId);
      const uniqueInstanceIds = new Set(instanceIds);
      
      if (instanceIds.length !== uniqueInstanceIds.size) {
        throw new Error('Duplicate items detected in withdrawal request');
      }

      // First verify that all selected items are in the current inventory
      const currentItems = selectedGame === 'ps99' ? inventory.ps99Items : inventory.mm2Items;
      
      // Check if each selected item exists exactly once in current inventory
      const invalidItems = selectedItems.filter(selectedItem => {
        const matchingItems = currentItems.filter(invItem => invItem.instanceId === selectedItem.instanceId);
        return matchingItems.length !== 1; // Should exist exactly once
      });

      if (invalidItems.length > 0) {
        throw new Error(`Some items are no longer in your inventory or appear multiple times. Please refresh and try again.`);
      }

      // If all items are verified, proceed with withdrawal
      const response = await axios.post('/api/withdraws/create', {
        items: selectedItems.map(item => ({
          name: item.name,
          value: item.value,
          game: selectedGame.toUpperCase(),
          image: item.image,
          instanceId: item.instanceId
        })),
        totalValue: calculateTotalValue()
      });

      if (response.data.success) {
        // Group items by name and calculate quantities
        const groupedItems = selectedItems.reduce((acc, item) => {
          if (!acc[item.name]) {
            acc[item.name] = {
              count: 0,
              value: item.value
            };
          }
          acc[item.name].count++;
          return acc;
        }, {});

        // Format items text with quantities
        const itemsText = Object.entries(groupedItems)
          .map(([name, data]) => {
            const displayText = data.count > 1 ? 
              `${name} x${data.count} - 💎 ${formatValueCompact(data.value * data.count)}` :
              `${name} - 💎 ${formatValueCompact(data.value)}`;
            return displayText;
          })
          .join('\n');

        // Send webhook notification
        const webhookData = {
          embeds: [{
            title: '🔄 New Withdrawal',
            color: 0x000000,
            description: `${userInfo.name}\n${itemsText}\nTotal: 💎 ${formatValueCompact(calculateTotalValue())}`
          }]
        };

        // Send the webhook
        await axios.post('https://discord.com/api/webhooks/1369473766853185717/evf0Owxd5qXsmVIWZ-lXjqMg94bDe0TtQyPxNHo7GTJIL0Hg5QiqXUg0QDoMo4iCVLoj', webhookData);

        toast.success('Withdrawal request created successfully');
        setSelectedItems([]);
        // Refresh inventory
        fetchInventory();
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error.response?.data?.message || error.message || 'Error processing withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalValue = () => {
    return selectedItems.reduce((total, item) => total + (item.value || 0), 0);
  };

  const getFilteredAndSortedItems = () => {
    const items = selectedGame === 'mm2' ? inventory.mm2Items : inventory.ps99Items;
    
    // Make sure items is an array before filtering
    let itemsArray = Array.isArray(items) ? items : [];
    
    let filteredItems = itemsArray;
    if (searchTerm && searchTerm.trim() !== '') {
      try {
        const searchLower = searchTerm.toLowerCase().trim();
        filteredItems = itemsArray.filter(item => 
          item && item.name && item.name.toLowerCase().includes(searchLower)
        );
      } catch (error) {
        console.error('Search filtering error:', error);
        // Fall back to unfiltered items if search fails
        filteredItems = itemsArray;
      }
    }

    // Sort items safely with null checks
    return filteredItems.sort((a, b) => {
      if (!a || !b) return 0;
      
      try {
        if (sortBy === 'value') {
          return ((b.value || 0) * (b.quantity || 1)) - ((a.value || 0) * (a.quantity || 1));
        } else if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'recent') {
          // Convert to dates safely - fall back to now if invalid
          const dateA = a.addedAt ? new Date(a.addedAt) : new Date();
          const dateB = b.addedAt ? new Date(b.addedAt) : new Date();
          return dateB - dateA;
        }
      } catch (error) {
        console.error('Sorting error:', error);
      }
      return 0;
    });
  };

  const handleDepositClick = (e) => {
    e.stopPropagation();
    setShowDepositModal(true);
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 17, 28, 0.95)',
      backdropFilter: 'blur(5px)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      backgroundColor: '#0B0E1A',
      borderRadius: '12px',
      padding: '24px',
      width: '90%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      border: '1px solid rgba(59, 66, 99, 0.5)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    },
    contentContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      overflow: 'hidden'
    },
    scrollableContent: {
      flex: 1,
      overflowY: 'auto',
      paddingRight: '8px',
      marginRight: '-8px',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '4px',
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(255, 184, 0, 0.3)',
        borderRadius: '4px',
        '&:hover': {
          background: 'rgba(255, 184, 0, 0.5)',
        }
      }
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    title: {
      color: '#ffd700',
      fontSize: '24px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#fff',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
      }
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      background: '#0D111F',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid rgba(59, 66, 99, 0.5)',
      backdropFilter: 'blur(10px)'
    },
    statLabel: {
      color: '#8B90A9',
      fontSize: '14px',
      marginBottom: '4px'
    },
    statValue: {
      color: '#fff',
      fontSize: '20px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    valueIcon: {
      fontSize: '24px'
    },
    gameSelector: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px'
    },
    gameButton: {
      padding: '10px 24px',
      borderRadius: '8px',
      border: '1px solid rgba(59, 66, 99, 0.5)',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif",
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    activeGameButton: {
      backgroundColor: '#0095FF',
      color: '#fff',
      border: 'none',
      boxShadow: '0 0 20px rgba(0, 149, 255, 0.2)'
    },
    inactiveGameButton: {
      backgroundColor: '#0D111F',
      color: '#8B90A9',
      '&:hover': {
        backgroundColor: '#131725'
      }
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '20px',
      padding: '16px'
    },
    itemCard: {
      backgroundColor: '#0D111F',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      border: '1px solid rgba(59, 66, 99, 0.5)',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(0, 149, 255, 0.15)',
        border: '1px solid rgba(0, 149, 255, 0.4)',
        '&::after': {
          opacity: 1
        }
      }
    },
    itemImage: {
      width: '120px',
      height: '120px',
      objectFit: 'contain',
      borderRadius: '8px',
      backgroundColor: 'rgba(255, 184, 0, 0.05)',
      padding: '8px',
      transition: 'transform 0.3s ease',
      '&:hover': {
        transform: 'scale(1.05)'
      }
    },
    itemName: {
      fontSize: '16px',
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#fff',
      fontFamily: "'Chakra Petch', sans-serif",
    },
    itemValue: {
      fontSize: '14px',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: "'Inter', sans-serif",
      background: '#131725',
      padding: '4px 12px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px',
      color: '#8B90A9',
      backgroundColor: '#0D111F',
      borderRadius: '12px',
      margin: '20px',
      border: '1px solid rgba(59, 66, 99, 0.5)'
    },
    emptyStateTitle: {
      color: '#FFB800',
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '12px',
      fontFamily: "'Chakra Petch', sans-serif",
    },
    controls: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
      alignItems: 'center',
      padding: '0 16px'
    },
    searchInput: {
      flex: 1,
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(59, 66, 99, 0.5)',
      background: '#0D111F',
      color: '#fff',
      fontSize: '14px',
      '&:focus': {
        outline: 'none',
        borderColor: '#0095FF',
        boxShadow: '0 0 0 2px rgba(0, 149, 255, 0.2)'
      }
    },
    sortSelect: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: 'rgba(13, 16, 31, 0.8)',
      color: '#fff',
      fontSize: '14px',
      cursor: 'pointer'
    },
    selectedItem: {
      border: '2px solid #0095FF',
      boxShadow: '0 0 15px rgba(0, 149, 255, 0.3)',
      transform: 'translateY(-2px)'
    },
    withdrawButton: {
      background: 'linear-gradient(135deg, #0095FF 0%, #0070FF 100%)',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '20px',
      position: 'sticky',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'fit-content',
      zIndex: 10,
      boxShadow: '0 4px 12px rgba(0, 149, 255, 0.2)',
      '&:hover': {
        transform: 'translateX(-50%) translateY(-2px)',
        boxShadow: '0 6px 15px rgba(0, 149, 255, 0.25)'
      }
    },
    selectedItemsCount: {
      color: '#FFB800',
      fontSize: '14px',
      marginLeft: '12px'
    },
    depositButton: {
      background: 'linear-gradient(45deg, #0095FF, #0070FF)',
      color: '#fff',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '8px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 12px rgba(0, 149, 255, 0.2)',
      }
    },
  };

  const renderItems = () => {
    const items = getFilteredAndSortedItems();
    
    if (loading) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateTitle}>Loading inventory... ✨</div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateTitle}>Error loading inventory 😢</div>
          <p>{error}</p>
        </div>
      );
    }

    if (!items || items.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateTitle}>No items found</div>
          <p>Deposit items to get started! 💎</p>
        </div>
      );
    }

    return (
      <div style={styles.itemsGrid}>
        {items.map((item) => (
          <div
            key={item.instanceId}
            style={{
              ...styles.itemCard,
              ...(selectedItems.some(i => i.instanceId === item.instanceId) ? styles.selectedItem : {})
            }}
            onClick={() => handleSelectItem(item)}
          >
            <img src={item.image} alt={item.name} style={styles.itemImage} />
            <div style={styles.itemName}>{item.name}</div>
            <div style={styles.itemValue}>
              <span>💎</span> {formatValue(item.value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>
            <span>Your Wallet</span>
            <span style={{ fontSize: '16px', color: '#8b949e' }}>✨</span>
          </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                style={styles.depositButton}
                onClick={handleDepositClick}
              >
                <span>📥</span>
                Deposit
              </button>
          <button style={styles.closeButton} onClick={onClose}>×</button>
            </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Value</div>
            <div style={styles.statValue}>
              <span>💎</span>
              <span style={{ color: '#FFD700' }}>
                {formatValue(inventoryStats.totalValue)}
              </span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Items</div>
            <div style={styles.statValue}>
              <span>📦</span>
              {inventoryStats.itemCount}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>PS99 Value</div>
            <div style={styles.statValue}>
              <span>⭐</span>
              <span style={{ color: '#FFD700' }}>
                {formatValue(inventoryStats.ps99Value)}
              </span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>MM2 Value</div>
            <div style={styles.statValue}>
              <span>🔪</span>
              <span style={{ color: '#FFD700' }}>
                {formatValue(inventoryStats.mm2Value)}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.gameSelector}>
          <button
            style={{
              ...styles.gameButton,
              ...(selectedGame === 'ps99' ? styles.activeGameButton : styles.inactiveGameButton)
            }}
            onClick={() => setSelectedGame('ps99')}
          >
            <span>⭐</span>
            PS99
          </button>
          <button
            style={{
              ...styles.gameButton,
              ...(selectedGame === 'mm2' ? styles.activeGameButton : styles.inactiveGameButton)
            }}
            onClick={() => setSelectedGame('mm2')}
          >
            <span>🔪</span>
            MM2
          </button>
        </div>

        <div style={styles.controls}>
          <button
            style={{
              ...styles.button,
              backgroundColor: '#FFB800',
              color: '#0D101F',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              marginRight: '12px'
            }}
            onClick={handleSelectAll}
          >
            {selectedItems.length === (selectedGame === 'ps99' ? inventory.ps99Items : inventory.mm2Items).length 
              ? 'Deselect All' 
              : 'Select All'}
          </button>

          {selectedItems.length > 0 && (
            <div style={{
              color: '#FFB800',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 184, 0, 0.1)',
              padding: '8px 16px',
              borderRadius: '8px'
            }}>
              <span>💎</span>
              Selected Value: {formatValueCompact(calculateTotalValue())}
            </div>
          )}

          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.contentContainer}>
          <div style={styles.scrollableContent}>
            {renderItems()}
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            marginTop: '20px'
          }}>
            <button
              style={{
                backgroundColor: loading ? '#666' : '#FFB800',
                color: loading ? '#999' : '#0D101F',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                border: 'none',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              onClick={handleWithdraw}
              disabled={loading}
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <span>💎</span>
                  Withdraw {selectedItems.length} Items ({formatValueCompact(calculateTotalValue())})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>

      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />
    </>
  );
};

export default Wallet; 