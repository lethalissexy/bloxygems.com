import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatValue } from '../utils/formatters';

const TipModal = ({ isOpen, onClose, recipient }) => {
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
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [visibleItems, setVisibleItems] = useState(50); // Starting with 50 visible items
  const [tipping, setTipping] = useState(false);
  const [tipStatus, setTipStatus] = useState(null);
  const itemsContainerRef = useRef(null);

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
      setIsSelectAll(false);
      setVisibleItems(50); // Reset visible items when modal opens
      setTipStatus(null);
    }
  }, [isOpen]);

  // Load more items as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      if (!itemsContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = itemsContainerRef.current;
      // If user has scrolled to near the bottom, load more items
      if (scrollHeight - scrollTop - clientHeight < 200) {
        const filtered = getFilteredAndSortedItems();
        if (visibleItems < filtered.length) {
          setVisibleItems(prev => Math.min(prev + 50, filtered.length));
        }
      }
    };

    const container = itemsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [visibleItems]);

  // Create a style tag for custom scrollbar styling and spinner animation
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .tip-modal-items::-webkit-scrollbar {
        width: 8px;
      }
      .tip-modal-items::-webkit-scrollbar-track {
        background: rgba(26, 31, 46, 0.5);
        border-radius: 4px;
      }
      .tip-modal-items::-webkit-scrollbar-thumb {
        background: rgba(255, 184, 0, 0.3);
        border-radius: 4px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
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
      // Filter out items with missing or invalid instanceId
      filteredItems = filteredItems.filter(item => {
        if (!item || typeof item !== 'object') return false;
        if (!item.instanceId) return false;
        
        // Ensure item has a name and value
        return item.name && (item.value !== undefined);
      });
      
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
        
        const aValue = parseFloat(a.value || 0) * (parseInt(a.quantity || 1));
        const bValue = parseFloat(b.value || 0) * (parseInt(b.quantity || 1));
        
        if (sortBy === 'high-low') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    } catch (error) {
      console.error('Error filtering or sorting items:', error);
      return []; // Return empty array if there's an error
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

  const handleSendTip = async () => {
    if (selectedItems.length === 0 || !recipient || !recipient.robloxId) {
      setTipStatus({ type: 'error', message: 'Please select items and ensure recipient is valid' });
      return;
    }
    
    try {
      setTipping(true);
      setTipStatus({ type: 'loading', message: 'Processing your tip...' });
      
      // Optimize by caching selected items before clearing selection
      const itemsToTip = [...selectedItems];
      const totalValue = calculateTotalValue();
      
      // Optimistically update UI immediately for better responsiveness
      const tippedIds = itemsToTip.map(item => item.instanceId);
      setInventory(prev => ({
        ...prev,
        ps99Items: prev.ps99Items.filter(item => !tippedIds.includes(item.instanceId))
      }));
      
      // Clear selected items immediately for better UI responsiveness
      setSelectedItems([]);
      
      // Get current user
      const userResponse = await axios.get('/api/user/current');
      
      if (!userResponse.data.user) {
        // Revert optimistic update if user not found
        setTipStatus({ type: 'error', message: 'You must be logged in to send a tip' });
        setTipping(false);
        return;
      }
      
      // Ensure valid IDs and format as strings
      const senderId = String(userResponse.data.user.robloxId || userResponse.data.user.id);
      const recipientId = String(recipient.robloxId);
      
      if (!senderId || senderId === 'undefined' || !recipientId || recipientId === 'undefined') {
        setTipStatus({ type: 'error', message: 'Invalid user IDs. Please try again.' });
        setTipping(false);
        return;
      }
      
      // Prepare payload - only send minimal data needed
      const payload = {
        senderId,
        recipientId,
        items: itemsToTip.map(item => ({ 
          instanceId: String(item.instanceId)
        }))
      };
      
      // Send the tip request with properly formatted data
      const response = await axios.post('/api/inventory/tip', payload);
      
      if (response.data.success) {
        setTipStatus({ 
          type: 'success', 
          message: `Successfully tipped ${response.data.itemCount} items worth R$${formatValue(totalValue)}!` 
        });
        
        // Auto-close after successful tip with delay
        setTimeout(() => {
          onClose();
        }, 2000); // Reduced to 2 seconds for faster UX
      } else {
        // If server reports error, show the error message
        setTipStatus({ 
          type: 'error', 
          message: response.data.error || 'There was an error processing your tip' 
        });
      }
    } catch (error) {
      console.error('Error sending tip:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      setTipStatus({ 
        type: 'error', 
        message: error.response?.data?.error || 'There was an error processing your tip. Check the console for details.' 
      });
    } finally {
      setTipping(false);
    }
  };

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
      maxWidth: '800px',
      maxHeight: '85vh',
      position: 'relative',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 100px rgba(255, 184, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px',
      borderBottom: '1px solid rgba(255, 184, 0, 0.15)'
    },
    title: {
      background: 'linear-gradient(135deg, #FFB800 0%, #FFDB1C 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontSize: '24px',
      fontWeight: 'bold',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#fff',
      fontSize: '24px',
      cursor: 'pointer',
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    content: {
      flex: 1,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      overflow: 'hidden'
    },
    recipientInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px'
    },
    avatarIcon: {
      width: '24px',
      height: '24px',
      borderRadius: '50%'
    },
    recipientName: {
      fontSize: '16px',
      color: '#ffffff',
      fontWeight: 'bold'
    },
    controls: {
      display: 'flex',
      gap: '10px',
      marginBottom: '16px'
    },
    searchInput: {
      flex: 1,
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: '#1A1F2E',
      color: '#fff',
      fontSize: '14px'
    },
    sortSelect: {
      padding: '10px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: '#1A1F2E',
      color: '#fff',
      fontSize: '14px',
      minWidth: '120px'
    },
    allButton: {
      padding: '10px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: isSelectAll ? 'rgba(255, 184, 0, 0.2)' : '#1A1F2E',
      color: '#FFB800',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: "'Chakra Petch', sans-serif",
      whiteSpace: 'nowrap'
    },
    statsContainer: {
      display: 'flex',
      gap: '16px',
      marginBottom: '16px',
      padding: '16px',
      background: '#1A1F2E',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.15)'
    },
    statBox: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    statValue: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#00E701',
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.6)'
    },
    noItemsMessage: {
      textAlign: 'center',
      padding: '30px',
      color: '#fff',
      background: '#1A1F2E',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.15)'
    },
    itemsContainer: {
      flex: 1,
      height: '400px',
      overflowY: 'auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '12px',
      padding: '8px 4px',
      marginRight: '-10px',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255, 184, 0, 0.3) rgba(26, 31, 46, 0.5)',
    },
    itemCard: {
      background: '#1A1F2E',
      borderRadius: '8px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      cursor: 'pointer',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      transition: 'all 0.2s ease',
      height: '150px'
    },
    selectedItem: {
      border: '2px solid #00E701',
      boxShadow: '0 0 10px rgba(0, 231, 1, 0.2)'
    },
    itemImage: {
      width: '60px',
      height: '60px',
      objectFit: 'contain',
      marginBottom: '4px'
    },
    itemName: {
      fontSize: '11px',
      color: '#fff',
      textAlign: 'center',
      width: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '0 4px'
    },
    itemValue: {
      fontSize: '12px',
      color: '#FFB800',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      marginTop: 'auto'
    },
    footer: {
      padding: '20px',
      borderTop: '1px solid rgba(255, 184, 0, 0.15)',
      background: 'linear-gradient(180deg, #0d1117 0%, rgba(13, 16, 31, 0.95) 100%)'
    },
    sendButton: {
      width: '100%',
      padding: '14px',
      background: 'linear-gradient(90deg, #00C853 0%, #00E676 100%)',
      border: 'none',
      borderRadius: '8px',
      color: '#000',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: "'Chakra Petch', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    loadingSpinner: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      height: '200px',
      gap: '16px'
    },
    spinnerAnimation: {
      width: '40px',
      height: '40px',
      border: '4px solid rgba(255, 184, 0, 0.1)',
      borderTopColor: '#FFB800',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    depositButton: {
      width: '100%',
      padding: '12px',
      margin: '0 auto',
      background: 'linear-gradient(90deg, #00E676 0%, #00C853 100%)',
      border: 'none',
      borderRadius: '8px',
      color: '#000',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'center',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    statusMessage: {
      padding: '12px',
      borderRadius: '8px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '12px'
    },
    successMessage: {
      background: 'rgba(0, 231, 1, 0.1)',
      border: '1px solid rgba(0, 231, 1, 0.3)',
      color: '#00E701'
    },
    errorMessage: {
      background: 'rgba(255, 79, 79, 0.1)',
      border: '1px solid rgba(255, 79, 79, 0.3)',
      color: '#FF4F4F'
    },
    loadingMessage: {
      background: 'rgba(255, 184, 0, 0.1)',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      color: '#FFB800',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    smallSpinner: {
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255, 184, 0, 0.1)',
      borderTopColor: '#FFB800',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      height: '200px',
      gap: '16px'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid rgba(255, 184, 0, 0.1)',
      borderTopColor: '#FFB800',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    loadingText: {
      color: '#fff',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    errorContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      height: '200px',
      gap: '16px'
    },
    errorIcon: {
      width: '40px',
      height: '40px',
      background: 'rgba(255, 79, 79, 0.1)',
      borderRadius: '50%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    errorText: {
      color: '#FF4F4F',
      fontSize: '14px',
      fontWeight: 'bold'
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Tip {recipient?.username || 'User'}</div>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          {tipStatus && (
            <div style={{
              ...styles.statusMessage,
              ...(tipStatus.type === 'success' ? styles.successMessage : 
                 tipStatus.type === 'error' ? styles.errorMessage : 
                 styles.loadingMessage)
            }}>
              {tipStatus.type === 'loading' && <div style={styles.smallSpinner}></div>}
              {tipStatus.message}
            </div>
          )}

          <div style={styles.controls}>
            <input
              type="text"
              placeholder="Search for an item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.sortSelect}
            >
              <option value="high-low">High - Low</option>
              <option value="low-high">Low - High</option>
            </select>
            <button 
              style={styles.allButton}
              onClick={handleSelectAll}
            >
              {isSelectAll ? 'Deselect All' : 'All'}
            </button>
          </div>

          <div style={styles.statsContainer}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>
                {selectedItems.length}
              </div>
              <div style={styles.statLabel}>ITEMS</div>
            </div>
            <div style={styles.statBox}>
              <div style={{...styles.statValue, color: '#FFB800'}}>
                {formatValue(calculateTotalValue())}
              </div>
              <div style={styles.statLabel}>WORTH</div>
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingSpinner}>
              <div style={styles.spinnerAnimation}></div>
              <div>Loading your inventory...</div>
            </div>
          ) : getFilteredAndSortedItems().length === 0 ? (
            <div style={styles.noItemsMessage}>
              <div>No Items!</div>
              <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '8px'}}>
                Your inventory seems to be empty...
              </div>
              <button style={styles.depositButton}>
                Deposit Items
              </button>
            </div>
          ) : (
            <div 
              style={styles.itemsContainer}
              className="tip-modal-items"
              ref={itemsContainerRef}
            >
              {getFilteredAndSortedItems().slice(0, visibleItems).map((item, index) => (
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
                      // Simpler data URI that doesn't rely on custom fonts
                      e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAA70lEQVR4nO3bMQ0AIAxAwQFKHfizQgg4YKQJnL9k086xvPeey3bo5nUAnAkJIyQMIWGEhCEkDCFhCAlDSBhCwhASRkj9OJww01uGkBk/JIyQMELCEBKGkDCEhCEkDCFhCAlDSBhCwggJQ0gYQsIQEoaQMISEISQMIWEICUNIGELCEBKGkDCEhCEkDCFhCAlDSBhCwhASxgkjjB8SRkgYQsIQEoaQMISEISQMIWEICUNIGELCCAlDSBhCwhASRkgYQsIQEoaQMISEISQMIWEICUNIGELCEBKGkDCEhCEkDCFhCAlDSBhCwhASxgkzrw89nwHH54BK9AAAAABJRU5ErkJggg==';
                    }}
                  />
                  <div style={styles.itemName}>{item.name}</div>
                  <div style={styles.itemValue}>
                    <span>💎</span>
                    {formatValue(item.value || 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={{
              ...styles.sendButton,
              ...(selectedItems.length === 0 || tipping ? styles.disabledButton : {})
            }}
            disabled={selectedItems.length === 0 || tipping}
            onClick={handleSendTip}
          >
            {tipping ? (
              <>
                <div style={styles.smallSpinner}></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>🪙</span>
                Tip {recipient?.username || 'User'} R${formatValue(calculateTotalValue())}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TipModal; 