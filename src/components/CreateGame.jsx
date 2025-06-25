import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatValue } from '../utils/formatters';
import LoadingSpinner from './LoadingSpinner';
import { HEADS_IMAGE_URL, TAILS_IMAGE_URL } from '../utils/coinflipAssets';
import { toast } from 'react-hot-toast';

const CreateGame = ({ isOpen, onClose, userInfo, onGameCreated }) => {
  const [inventory, setInventory] = useState({
    mm2Items: [],
    ps99Items: [],
    stats: {
      mm2: { itemCount: 0, totalValue: 0 },
      ps99: { itemCount: 0, totalValue: 0 },
      overall: { totalValue: 0 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGame, setSelectedGame] = useState('ps99');
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('value');
  const [creatingGame, setCreatingGame] = useState(false);
  const [valueRange, setValueRange] = useState({ min: 0, max: 0 });
  const [selectedSide, setSelectedSide] = useState('heads');

  // Calculate the total value of selected items
  const selectedValue = selectedItems.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/user/current');
        if (response.data.user) {
          setInventory({
            mm2Items: response.data.inventory.mm2Items || [],
            ps99Items: response.data.inventory.ps99Items || [],
            stats: response.data.inventory.stats || {
              mm2: { itemCount: 0, totalValue: 0 },
              ps99: { itemCount: 0, totalValue: 0 },
              overall: { totalValue: 0 }
            }
          });
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
        setError('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen]);

  // Update value range based on selected value
  useEffect(() => {
    if (selectedValue > 0) {
      const min = Math.max(selectedValue * 0.9, 1);
      const max = selectedValue * 1.1;
      setValueRange({ min, max });
    } else {
      setValueRange({ min: 0, max: 0 });
    }
  }, [selectedValue]);

  // Clear selected items when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedItems([]);
      setSelectedSide('heads');
      setSearchTerm('');
      setSortBy('value');
      setError(null);
    }
  }, [isOpen]);

  const handleItemSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.some(i => i.instanceId === item.instanceId);
      if (exists) {
        return prev.filter(i => i.instanceId !== item.instanceId);
      } else {
        return [...prev, item];
      }
    });
  };

  // Handle select all items
  const handleSelectAll = () => {
    const items = getFilteredAndSortedItems();
    if (selectedItems.length === items.length) {
      // If all items are already selected, deselect all
      setSelectedItems([]);
    } else {
      // Select all items
      setSelectedItems(items);
    }
  };

  const handleCreateGame = async () => {
    if (selectedItems.length === 0) return;
    
    setCreatingGame(true);
    try {
      // Prepare selected items data
      const gameData = {
        items: selectedItems.map(item => ({ 
          instanceId: item.instanceId,
          value: item.value,
          name: item.name,
          image: item.image,
          game: selectedGame
        })),
        value: selectedValue,
        valueRange: {
          min: Math.floor(valueRange.min),
          max: Math.ceil(valueRange.max)
        },
        side: selectedSide,
        creatorName: userInfo.username,
        joinerName: null
      };
      
      // Make API call to create game
      const response = await axios.post('/api/coinflip/create', gameData);
      
      if (response.data.success) {
        // Close the create modal
        onClose();
        
        // Show success toast
        toast.success('Coinflip game created successfully! 🎉', {
          duration: 3500
        });

        // Add a delay before showing the game modal
        setTimeout(() => {
          // Call the onGameCreated callback with the new game data
          if (onGameCreated) {
            onGameCreated(response.data.game);
          }
        }, 1000);
      } else {
        // Handle validation errors
        if (response.data.invalidItems) {
          const itemNames = response.data.invalidItems.join(', ');
          setError(`Invalid items detected: ${itemNames}. Please refresh your inventory.`);
          toast.error(`Some items are not in your inventory: ${itemNames}`, {
            duration: 5000
          });
        } else {
          setError(response.data.message || 'Failed to create game');
          toast.error(response.data.message || 'Failed to create game', {
            duration: 3500
          });
        }
      }
    } catch (err) {
      console.error('Error creating game:', err);
      // Handle validation errors from axios error response
      if (err.response && err.response.data) {
        if (err.response.data.invalidItems) {
          const itemNames = err.response.data.invalidItems.join(', ');
          setError(`Invalid items detected: ${itemNames}. Please refresh your inventory.`);
          toast.error(`Some items are not in your inventory: ${itemNames}`, {
            duration: 5000
          });
        } else {
          setError(err.response.data.message || 'Something went wrong. Please try again.');
          toast.error(err.response.data.message || 'Something went wrong. Please try again.', {
            duration: 3500
          });
        }
      } else {
        setError('Something went wrong. Please try again.');
        toast.error('Something went wrong. Please try again.', {
          duration: 3500
        });
      }
    } finally {
      setCreatingGame(false);
    }
  };

  const getFilteredAndSortedItems = () => {
    try {
      // Get items based on selected game and ensure it's an array
      const gameItems = selectedGame === 'mm2' ? inventory.mm2Items : inventory.ps99Items;
      const items = Array.isArray(gameItems) ? gameItems : [];
      
      // Filter items if search term exists
      let filteredItems = items;
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        filteredItems = items.filter(item => 
          item && item.name && typeof item.name === 'string' && 
          item.name.toLowerCase().includes(searchLower)
        );
      }

      // Sort items with proper null checks
      return filteredItems.sort((a, b) => {
        if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return 0;
        
        if (sortBy === 'value') {
          // Ensure values are numbers
          const aValue = parseFloat(a.value) || 0;
          const bValue = parseFloat(b.value) || 0;
          return bValue - aValue; // High to low by default
        } else if (sortBy === 'name') {
          // Ensure names are strings
          const aName = (a.name && typeof a.name === 'string') ? a.name : '';
          const bName = (b.name && typeof b.name === 'string') ? b.name : '';
          return aName.localeCompare(bName);
        } else if (sortBy === 'recent') {
          // Safe date comparison with fallbacks
          let aDate, bDate;
          try {
            aDate = a.addedAt ? new Date(a.addedAt) : new Date(0);
          } catch {
            aDate = new Date(0);
          }
          
          try {
            bDate = b.addedAt ? new Date(b.addedAt) : new Date(0);
          } catch {
            bDate = new Date(0);
          }
          
          return bDate - aDate;
        }
        return 0;
      });
    } catch (error) {
      console.error('Error filtering or sorting items:', error);
      return [];
    }
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(5px)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      backgroundColor: '#0d1117',
      borderRadius: '12px',
      padding: '24px',
      width: '90%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      border: '1px solid rgba(255, 184, 0, 0.15)',
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
      marginRight: '-8px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    title: {
      color: '#FFB800',
      fontSize: '24px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: "'Chakra Petch', sans-serif"
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
      transition: 'background-color 0.2s'
    },
    gameSelector: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px'
    },
    gameButton: {
      padding: '10px 24px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
      fontFamily: "'Chakra Petch', sans-serif",
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    activeGameButton: {
      backgroundColor: '#FFB800',
      color: '#0D101F',
      border: 'none',
      boxShadow: '0 0 20px rgba(255, 184, 0, 0.2)'
    },
    inactiveGameButton: {
      backgroundColor: 'rgba(255, 184, 0, 0.1)',
      color: '#FFB800'
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '20px',
      padding: '16px'
    },
    itemCard: {
      backgroundColor: '#161B33',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      position: 'relative',
      overflow: 'hidden'
    },
    itemImage: {
      width: '120px',
      height: '120px',
      objectFit: 'contain',
      borderRadius: '8px',
      backgroundColor: 'rgba(255, 184, 0, 0.05)',
      padding: '8px',
      transition: 'transform 0.3s ease'
    },
    itemName: {
      fontSize: '16px',
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#fff',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    itemValue: {
      fontSize: '14px',
      color: '#FFB800',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: "'Chakra Petch', sans-serif",
      background: 'rgba(255, 184, 0, 0.1)',
      padding: '4px 12px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(255, 184, 0, 0.1)'
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px',
      color: '#B8C3E6',
      backgroundColor: '#161B33',
      borderRadius: '12px',
      margin: '20px',
      border: '1px solid rgba(255, 184, 0, 0.15)'
    },
    emptyStateTitle: {
      color: '#FFB800',
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '12px',
      fontFamily: "'Chakra Petch', sans-serif"
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
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: 'rgba(13, 16, 31, 0.8)',
      color: '#fff',
      fontSize: '14px',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    sortSelect: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: 'rgba(13, 16, 31, 0.8)',
      color: '#fff',
      fontSize: '14px',
      cursor: 'pointer',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    selectedItem: {
      border: '2px solid #FFB800',
      boxShadow: '0 0 15px rgba(255, 184, 0, 0.3)',
      transform: 'translateY(-2px)'
    },
    createButton: {
      background: 'linear-gradient(135deg, #FFB800 0%, #FFC93C 100%)',
      color: '#0D101F',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      margin: '16px auto',
      fontFamily: "'Chakra Petch', sans-serif",
      minWidth: '200px',
      boxShadow: '0 4px 12px rgba(255, 184, 0, 0.2)'
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    },
    depositButton: {
      background: 'linear-gradient(135deg, #00BFFF 0%, #1E90FF 100%)',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '16px',
      fontFamily: "'Chakra Petch', sans-serif",
      boxShadow: '0 4px 12px rgba(30, 144, 255, 0.2)'
    },
    gameInfo: {
      marginTop: '20px',
      backgroundColor: 'rgba(255, 184, 0, 0.05)',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 184, 0, 0.15)'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    },
    infoLabel: {
      color: '#8b949e',
      fontSize: '14px'
    },
    infoValue: {
      color: '#FFB800',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    rangeContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    coinSelector: {
      display: 'flex',
      justifyContent: 'center',
      gap: '20px',
      marginBottom: '20px'
    },
    coinButton: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      cursor: 'pointer',
      border: '2px solid transparent',
      padding: '3px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    },
    coinImage: {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      borderRadius: '50%'
    },
    selectedCoin: {
      border: '2px solid #FFB800',
      boxShadow: '0 0 15px rgba(255, 184, 0, 0.5)'
    },
    selectAllButton: {
      background: 'rgba(255, 184, 0, 0.1)',
      color: '#FFB800',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginLeft: 'auto',
      fontFamily: "'Chakra Petch', sans-serif"
    }
  };

  const renderItems = () => {
    try {
      const items = getFilteredAndSortedItems();
      
      if (loading) {
        return (
          <div style={{
            ...styles.emptyState,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            padding: '20px'
          }}>
            <LoadingSpinner size={50} centered />
            <div style={{
              ...styles.emptyStateTitle,
              marginTop: '20px',
              fontSize: '18px'
            }}>Loading inventory...</div>
          </div>
        );
      }

      if (error) {
        return (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateTitle}>Error loading inventory</div>
            <p>{error}</p>
          </div>
        );
      }

      if (!Array.isArray(items) || items.length === 0) {
        return (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateTitle}>No items found</div>
            <p>Deposit items to create a coinflip game</p>
            <button style={styles.depositButton}>
              Deposit Items
            </button>
          </div>
        );
      }

      return (
        <div style={styles.itemsGrid}>
          {items.map((item, index) => {
            // Skip rendering for invalid items
            if (!item || typeof item !== 'object' || !item.name) {
              return null;
            }
            
            return (
              <div
                key={item.instanceId || `item-${index}`}
                style={{
                  ...styles.itemCard,
                  ...(selectedItems.some(i => i.instanceId === item.instanceId) ? styles.selectedItem : {})
                }}
                onClick={() => handleItemSelect(item)}
              >
                <img 
                  src={item.image || ''} 
                  alt={item.name} 
                  style={styles.itemImage}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/120?text=Image+Error';
                  }}
                />
                <div style={styles.itemName}>{item.name}</div>
                <div style={styles.itemValue}>
                  {formatValue(parseFloat(item.value) || 0)}
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      console.error('Error rendering items:', error);
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateTitle}>Error displaying items</div>
          <p>An unexpected error occurred. Please try again.</p>
        </div>
      );
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>
            <span>Create Coinflip Game</span>
          </div>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={{
          display: 'flex',
          marginBottom: '24px',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '12px'
        }}>
          <div style={styles.gameSelector}>
            <button
              style={{
                ...styles.gameButton,
                ...(selectedGame === 'ps99' ? styles.activeGameButton : styles.inactiveGameButton)
              }}
              onClick={() => setSelectedGame('ps99')}
            >
              PS99
            </button>
            <button
              style={{
                ...styles.gameButton,
                ...(selectedGame === 'mm2' ? styles.activeGameButton : styles.inactiveGameButton)
              }}
              onClick={() => setSelectedGame('mm2')}
            >
              MM2
            </button>
          </div>
        </div>

        <div style={styles.controls}>
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.sortSelect}
          >
            <option value="value">Sort by Value</option>
            <option value="name">Sort by Name</option>
            <option value="recent">Sort by Recent</option>
          </select>
        </div>

        {selectedItems.length > 0 && (
          <div style={styles.gameInfo}>
            <div style={styles.infoRow}>
              <div style={styles.infoLabel}>Selected Items</div>
              <div style={styles.infoValue}>{selectedItems.length} items</div>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoLabel}>Total Value</div>
              <div style={styles.infoValue}>{formatValue(selectedValue)}</div>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoLabel}>Join Range</div>
              <div style={styles.rangeContainer}>
                <div style={styles.infoValue}>{formatValue(valueRange.min)}</div>
                <div style={styles.infoLabel}>-</div>
                <div style={styles.infoValue}>{formatValue(valueRange.max)}</div>
              </div>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoLabel}>Your Side</div>
              <div style={styles.infoValue}>{selectedSide.charAt(0).toUpperCase() + selectedSide.slice(1)}</div>
            </div>
          </div>
        )}

        <div style={styles.contentContainer}>
          <div style={styles.scrollableContent}>
            {renderItems()}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          marginBottom: '20px',
          padding: '10px 20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '10px'
          }}>
            <div 
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                cursor: 'pointer',
                border: selectedSide === 'heads' ? '2px solid #FFB800' : '1px solid rgba(255, 255, 255, 0.2)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                background: selectedSide === 'heads' ? 'rgba(255, 184, 0, 0.1)' : 'transparent'
              }}
              onClick={() => setSelectedSide('heads')}
            >
              <img 
                src={HEADS_IMAGE_URL}
                alt="H" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '50%'
                }}
              />
            </div>
            <div 
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                cursor: 'pointer',
                border: selectedSide === 'tails' ? '2px solid #FFB800' : '1px solid rgba(255, 255, 255, 0.2)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                background: selectedSide === 'tails' ? 'rgba(255, 184, 0, 0.1)' : 'transparent'
              }}
              onClick={() => setSelectedSide('tails')}
            >
              <img 
                src={TAILS_IMAGE_URL}
                alt="T" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '50%'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '10px'
          }}>
            <button
              onClick={handleSelectAll}
              style={{
                background: '#161B33',
                color: '#fff',
                border: '1px solid #2a2e45',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: 'auto',
                minWidth: '120px',
              }}
            >
              Select All
            </button>
            
            <button
              onClick={handleCreateGame}
              disabled={selectedItems.length === 0 || creatingGame}
              style={{
                background: '#161B33',
                color: '#fff',
                border: '1px solid #2a2e45',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: 'auto',
                minWidth: '120px',
                ...(selectedItems.length === 0 || creatingGame ? { opacity: 0.5, cursor: 'not-allowed' } : {})
              }}
            >
              {creatingGame ? 'Creating...' : selectedItems.length > 0 ? `Create ${formatValue(selectedValue)}` : 'Create R$0'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGame; 