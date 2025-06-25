import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatValue } from '../utils/formatters';
import { COINFLIP_IMAGES, COINFLIP_SIDES } from '../constants/coinflip';

const CreateCoinflip = ({ isOpen, onClose }) => {
  const [inventory, setInventory] = useState({
    ps99Items: [],
    stats: {
      ps99: { itemCount: 0, totalValue: 0 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('high-low');
  const [selectedSide, setSelectedSide] = useState(null);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/user/current');
        if (response.data.user) {
          setInventory({
            ps99Items: response.data.inventory.ps99Items || [],
            stats: response.data.inventory.stats || {
              ps99: { itemCount: 0, totalValue: 0 }
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
      // Reset states when modal opens
      setSelectedItems([]);
      setSearchTerm('');
      setSortBy('high-low');
      setSelectedSide(null);
      setIsSelectAll(false);
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

  const handleSelectAll = () => {
    const filteredItems = getFilteredAndSortedItems();
    if (isSelectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems);
    }
    setIsSelectAll(!isSelectAll);
  };

  const getFilteredAndSortedItems = () => {
    // Ensure inventory.ps99Items is an array
    let filteredItems = Array.isArray(inventory.ps99Items) ? inventory.ps99Items : [];
    
    try {
      // Only filter if searchTerm is valid
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item && item.name && typeof item.name === 'string' && 
          item.name.toLowerCase().includes(searchLower)
        );
      }

      // Sort the items safely
      return filteredItems.sort((a, b) => {
        // Ensure both items are valid objects with value property
        if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return 0;
        
        const aValue = (a.value || 0) * ((a.quantity || 1));
        const bValue = (b.value || 0) * ((b.quantity || 1));
        
        if (sortBy === 'high-low') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    } catch (error) {
      console.error('Error filtering or sorting items:', error);
      return filteredItems; // Return unfiltered items if there's an error
    }
  };

  const handleCreateGame = async () => {
    if (!selectedSide || selectedItems.length === 0) {
      setError('Please select a side and at least one item');
      return;
    }

    try {
      setLoading(true);
      setError('');
      // Create the coinflip game
      const createResponse = await axios.post('/api/coinflip/create', {
        items: selectedItems,
        side: selectedSide,
        value: calculateTotalValue()
      });

      if (createResponse.data.success) {
        setSuccess('🎲 Game created successfully! Redirecting...');
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating game:', error);
      setError(error.response?.data?.error || 'Failed to create game');
    } finally {
      setLoading(false);
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
      backgroundColor: 'rgba(13, 16, 31, 0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      background: 'linear-gradient(180deg, #0d1117 0%, rgba(13, 16, 31, 0.95) 100%)',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '1200px',
      height: '90vh',
      position: 'relative',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 100px rgba(255, 184, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column'
    },
    content: {
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      gap: '24px'
    },
    scrollableContent: {
      flex: 1,
      overflowY: 'auto',
      marginRight: '-12px',
      paddingRight: '12px',
      minHeight: 0,
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'rgba(255, 184, 0, 0.05)',
        borderRadius: '4px',
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(255, 184, 0, 0.3)',
        borderRadius: '4px',
        '&:hover': {
          background: 'rgba(255, 184, 0, 0.5)',
        },
      },
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      background: 'linear-gradient(135deg, #FFB800 0%, #FFDB1C 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontSize: '28px',
      fontWeight: 'bold',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#fff',
      fontSize: '28px',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        transform: 'rotate(90deg)'
      }
    },
    sideSelector: {
      display: 'flex',
      justifyContent: 'center',
      gap: '32px',
      marginBottom: '32px',
      padding: '24px',
      background: 'linear-gradient(180deg, rgba(26, 31, 46, 0.5) 0%, rgba(13, 16, 31, 0.5) 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      boxShadow: 'inset 0 0 50px rgba(255, 184, 0, 0.05)'
    },
    sideOption: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      cursor: 'pointer',
      padding: '24px',
      borderRadius: '12px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '2px solid transparent',
      background: 'rgba(13, 16, 31, 0.5)',
      '&:hover': {
        transform: 'scale(1.05)',
        background: 'rgba(255, 184, 0, 0.05)',
        boxShadow: '0 0 30px rgba(255, 184, 0, 0.1)'
      }
    },
    sideImage: {
      width: '120px',
      height: '120px',
      objectFit: 'contain',
      transition: 'all 0.3s ease',
      filter: 'drop-shadow(0 0 10px rgba(255, 184, 0, 0.2))'
    },
    selectedSide: {
      border: '2px solid #FFB800',
      background: 'linear-gradient(180deg, rgba(255, 184, 0, 0.15) 0%, rgba(255, 184, 0, 0.05) 100%)',
      boxShadow: '0 0 30px rgba(255, 184, 0, 0.15)',
      transform: 'scale(1.05)'
    },
    controls: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      padding: '0 16px'
    },
    searchInput: {
      flex: 1,
      padding: '12px 20px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: 'rgba(13, 16, 31, 0.8)',
      color: '#fff',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      '&:focus': {
        outline: 'none',
        borderColor: '#FFB800',
        boxShadow: '0 0 0 2px rgba(255, 184, 0, 0.2)'
      }
    },
    sortSelect: {
      padding: '12px 20px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: 'rgba(13, 16, 31, 0.8)',
      color: '#fff',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      '&:focus': {
        outline: 'none',
        borderColor: '#FFB800',
        boxShadow: '0 0 0 2px rgba(255, 184, 0, 0.2)'
      }
    },
    selectAllButton: {
      padding: '12px 20px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: isSelectAll ? 'rgba(255, 184, 0, 0.2)' : 'rgba(13, 16, 31, 0.8)',
      color: '#FFB800',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: "'Chakra Petch', sans-serif",
      '&:hover': {
        background: 'rgba(255, 184, 0, 0.1)',
        borderColor: '#FFB800'
      }
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '16px',
      padding: '16px',
      alignItems: 'start',
      width: '100%',
      height: 'fit-content',
    },
    itemCard: {
      background: 'linear-gradient(180deg, #161B33 0%, #0d1117 100%)',
      borderRadius: '12px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      width: '100%',
      height: '200px',
      boxSizing: 'border-box',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(255, 184, 0, 0.15)',
        borderColor: '#FFB800',
      },
    },
    selectedItem: {
      border: '2px solid #FFB800',
      background: 'linear-gradient(180deg, rgba(255, 184, 0, 0.1) 0%, rgba(255, 184, 0, 0.05) 100%)',
      boxShadow: '0 0 20px rgba(255, 184, 0, 0.15)',
      transform: 'translateY(-4px)',
    },
    itemImage: {
      width: '100%',
      height: '60%',
      objectFit: 'contain',
      transition: 'all 0.3s ease',
      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))',
      borderRadius: '8px',
      background: 'rgba(13, 16, 31, 0.5)',
      padding: '8px',
      border: '1px solid rgba(255, 184, 0, 0.1)',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      img: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
      },
    },
    itemName: {
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'center',
      fontFamily: "'Chakra Petch', sans-serif",
      width: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '0 4px',
    },
    itemValue: {
      fontSize: '14px',
      color: '#FFB800',
      fontFamily: "'Chakra Petch', sans-serif",
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      background: 'rgba(255, 184, 0, 0.1)',
      padding: '4px 8px',
      borderRadius: '4px',
      border: '1px solid rgba(255, 184, 0, 0.2)',
      marginTop: 'auto',
    },
    footer: {
      borderTop: '1px solid rgba(255, 184, 0, 0.15)',
      padding: '16px 24px',
      background: 'linear-gradient(180deg, #0d1117 0%, rgba(13, 16, 31, 0.95) 100%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    totalValue: {
      background: 'linear-gradient(135deg, #FFB800 0%, #FFDB1C 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontSize: '20px',
      fontWeight: 'bold',
      textAlign: 'right',
      marginTop: '20px',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    createButton: {
      width: '100%',
      padding: '20px',
      marginTop: '24px',
      background: 'linear-gradient(135deg, #FFB800 0%, #FF9500 100%)',
      border: 'none',
      borderRadius: '12px',
      color: '#000',
      fontSize: '20px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      fontFamily: "'Chakra Petch', sans-serif",
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(255, 184, 0, 0.2)',
        background: 'linear-gradient(135deg, #FFc000 0%, #FFa500 100%)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'none'
      }
    },
    successMessage: {
      color: '#4BB543',
      fontSize: '14px',
      textAlign: 'center',
      padding: '12px',
      background: 'rgba(75, 181, 67, 0.1)',
      borderRadius: '8px',
      margin: '0 24px',
      border: '1px solid rgba(75, 181, 67, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    errorMessage: {
      color: '#ff4444',
      fontSize: '14px',
      textAlign: 'center',
      padding: '12px',
      background: 'rgba(255, 68, 68, 0.1)',
      borderRadius: '8px',
      margin: '0 24px',
      border: '1px solid rgba(255, 68, 68, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(13, 16, 31, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      backdropFilter: 'blur(5px)'
    },
    loadingContent: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      color: '#FFB800',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    loadingSpinner: {
      width: '40px',
      height: '40px',
      border: '3px solid rgba(255, 184, 0, 0.1)',
      borderTop: '3px solid #FFB800',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    messageContainer: {
      position: 'absolute',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 11,
      minWidth: '300px',
      maxWidth: '90%'
    },
    selectedItemsInfo: {
      marginBottom: '24px',
      background: 'rgba(13, 17, 28, 0.6)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      overflow: 'hidden'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: '1px solid rgba(255, 184, 0, 0.1)'
    },
    infoLabel: {
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.7)',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    infoValue: {
      fontSize: '16px',
      color: '#FFB800',
      fontWeight: 'bold',
      fontFamily: "'Chakra Petch', sans-serif"
    }
  };

  const calculateTotalValue = () => {
    try {
      if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
        return 0;
      }
      
      return selectedItems.reduce((sum, item) => {
        if (!item || typeof item !== 'object') return sum;
        const itemValue = parseFloat(item.value) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return sum + (itemValue * quantity);
      }, 0);
    } catch (error) {
      console.error('Error calculating total value:', error);
      return 0;
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {(success || error) && (
          <div style={styles.messageContainer}>
            <div style={success ? styles.successMessage : styles.errorMessage}>
              <span style={{ fontSize: '18px' }}>{success ? '✨' : '⚠️'}</span>
              {success || error}
            </div>
          </div>
        )}

        {loading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingContent}>
              <div style={styles.loadingSpinner} />
              <div>Processing your request...</div>
            </div>
          </div>
        )}

        <div style={styles.header}>
          <div style={styles.title}>
            Create Coinflip
            <span style={{ fontSize: '20px', opacity: 0.7 }}>✨</span>
          </div>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          <div style={styles.sideSelector}>
            <div 
              style={{
                ...styles.sideOption,
                ...(selectedSide === COINFLIP_SIDES.HEADS ? styles.selectedSide : {})
              }}
              onClick={() => setSelectedSide(COINFLIP_SIDES.HEADS)}
            >
              <img src={COINFLIP_IMAGES.HEADS} alt="Heads" style={styles.sideImage} />
              <span style={{ color: '#FFB800', fontSize: '20px', fontFamily: "'Chakra Petch', sans-serif" }}>HEADS</span>
            </div>
            <div 
              style={{
                ...styles.sideOption,
                ...(selectedSide === COINFLIP_SIDES.TAILS ? styles.selectedSide : {})
              }}
              onClick={() => setSelectedSide(COINFLIP_SIDES.TAILS)}
            >
              <img src={COINFLIP_IMAGES.TAILS} alt="Tails" style={styles.sideImage} />
              <span style={{ color: '#FFB800', fontSize: '20px', fontFamily: "'Chakra Petch', sans-serif" }}>TAILS</span>
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
              <option value="high-low">High to Low</option>
              <option value="low-high">Low to High</option>
            </select>
            <button
              style={styles.selectAllButton}
              onClick={handleSelectAll}
            >
              {isSelectAll ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={styles.scrollableContent}>
            <div style={styles.itemsGrid}>
              {(() => {
                try {
                  const items = getFilteredAndSortedItems();
                  if (!Array.isArray(items) || items.length === 0) {
                    return (
                      <div style={{
                        padding: '24px',
                        color: '#fff',
                        textAlign: 'center',
                        width: '100%'
                      }}>
                        {loading ? 'Loading items...' : 'No items found'}
                      </div>
                    );
                  }
                  
                  return items.map((item, index) => {
                    if (!item || typeof item !== 'object' || !item.name) return null;
                    
                    return (
                      <div
                        key={`${item.name}-${index}`}
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
                            e.target.src = 'https://via.placeholder.com/100?text=Image+Error';
                          }}
                        />
                        <div style={styles.itemName}>{item.name}</div>
                        <div style={styles.itemValue}>
                          <span>💎</span>
                          {formatValue(item.value || 0)}
                        </div>
                      </div>
                    );
                  });
                } catch (error) {
                  console.error('Error rendering items:', error);
                  return (
                    <div style={{
                      padding: '24px',
                      color: '#ff6b6b',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      An error occurred while displaying items. Please try again.
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.totalValue}>
            R$ {formatValue(calculateTotalValue())}
          </div>
          <button
            style={{
              ...styles.createButton,
              ...((!selectedSide || selectedItems.length === 0) && styles.createButton['&:disabled'])
            }}
            onClick={handleCreateGame}
            disabled={!selectedSide || selectedItems.length === 0 || loading}
          >
            {loading ? 'Creating...' : `Create ${formatValue(calculateTotalValue())}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCoinflip; 