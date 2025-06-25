import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatValue, formatTimeAgo } from '../utils/formatters';
import { createGiveaway } from '../api/giveaways';

const GiveawayModal = ({ isOpen, onClose, userInfo }) => {
  console.log('GiveawayModal render with isOpen:', isOpen);
  
  const [inventory, setInventory] = useState({ ps99Items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('high-low');
  const [creating, setCreating] = useState(false);
  const [giveawayTime, setGiveawayTime] = useState('');
  const [numWinners, setNumWinners] = useState(1);
  const itemsContainerRef = useRef(null);
  const [visibleItems, setVisibleItems] = useState(50);
  const [activeTab, setActiveTab] = useState('active');
  const [activeGiveaways, setActiveGiveaways] = useState([]);
  const [endedGiveaways, setEndedGiveaways] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  const resetForm = () => {
    setSelectedItems([]);
    setSearchTerm('');
    setSortBy('high-low');
    setGiveawayTime('');
    setNumWinners(1);
    setError(null);
  };

  // First useEffect - for fetching inventory when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    console.log('GiveawayModal useEffect triggered, isOpen:', isOpen);
    
    const fetchInventory = async () => {
      console.log('Fetching inventory...');
      try {
        setLoading(true);
        const response = await axios.get('/api/user/current');
        console.log('Inventory response:', response.data);
        if (response.data.user) {
          setInventory({
            ps99Items: response.data.inventory.ps99Items || []
          });
          console.log('Set inventory with items count:', response.data.inventory.ps99Items?.length || 0);
        }
      } catch (err) {
        console.error('Error loading inventory:', err);
        setError('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInventory();
    resetForm();
  }, [isOpen]);

  // Second useEffect - implement infinite scroll
  useEffect(() => {
    if (!isOpen || !itemsContainerRef.current) return;
    
    const handleScroll = () => {
      if (!itemsContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = itemsContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setVisibleItems(prev => prev + 50);
      }
    };
    
    const container = itemsContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  // Third useEffect - validate winners count based on item count
  useEffect(() => {
    if (!isOpen || selectedItems.length === 0) {
      // If modal is closed or no items selected, just set to 1 winner
      if (numWinners !== 1) setNumWinners(1);
      return;
    }
    
    // Get possible winner counts (where each winner gets same number of items)
    const possibleWinnerCounts = [];
    for (let i = 1; i <= selectedItems.length; i++) {
      if (selectedItems.length % i === 0) {
        possibleWinnerCounts.push(i);
      }
    }
    
    // If current winner count is not valid, set to the nearest valid count
    if (!possibleWinnerCounts.includes(numWinners)) {
      // Find the closest valid winner count
      const closest = possibleWinnerCounts.reduce((prev, curr) => {
        return (Math.abs(curr - numWinners) < Math.abs(prev - numWinners) ? curr : prev);
      }, possibleWinnerCounts[0]);
      
      setNumWinners(closest);
    }
  }, [selectedItems, numWinners, isOpen]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Fetch giveaways when modal opens
    if (isOpen) {
      fetchGiveaways();
    }
  }, [isOpen]);

  const fetchGiveaways = async () => {
    try {
      const response = await fetch('/api/giveaways');
      const data = await response.json();
      
      setActiveGiveaways(data.active || []);
      setEndedGiveaways(data.ended || []);
    } catch (error) {
      console.error('Error fetching giveaways:', error);
    }
  };

  const handleJoin = async (giveawayId) => {
    if (!userInfo) {
      // Show login prompt
      return;
    }

    try {
      const response = await fetch(`/api/giveaways/${giveawayId}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Refresh giveaways list
        fetchGiveaways();
      }
    } catch (error) {
      console.error('Error joining giveaway:', error);
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) {
    console.log('GiveawayModal not rendering because isOpen is false');
    return null;
  }

  console.log('GiveawayModal continuing to render because isOpen is true');

  const handleItemSelect = (item) => {
    if (selectedItems.some(i => i.instanceId === item.instanceId)) {
      setSelectedItems(prev => {
        const newItems = prev.filter(i => i.instanceId !== item.instanceId);
        return newItems;
      });
    } else {
      setSelectedItems(prev => [...prev, item]);
    }
  };

  const getFilteredAndSortedItems = () => {
    let items = Array.isArray(inventory.ps99Items) ? inventory.ps99Items : [];
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      items = items.filter(item => 
        item && item.name && item.name.toLowerCase().includes(search)
      );
    }
    
    // Sort by value
    return items.sort((a, b) => {
      const aValue = parseFloat(a?.value || 0);
      const bValue = parseFloat(b?.value || 0);
      return sortBy === 'high-low' ? bValue - aValue : aValue - bValue;
    });
  };

  const calculateTotalValue = () => {
    return selectedItems.reduce((sum, item) => 
      sum + (parseFloat(item?.value || 0)), 0
    );
  };

  const getPossibleWinnerCounts = () => {
    if (selectedItems.length === 0) return [1];
    
    const possibleCounts = [];
    for (let i = 1; i <= selectedItems.length; i++) {
      if (selectedItems.length % i === 0) {
        possibleCounts.push(i);
      }
    }
    return possibleCounts;
  };

  const getItemsPerWinner = () => {
    if (selectedItems.length === 0 || numWinners === 0) return 0;
    return selectedItems.length / numWinners;
  };

  // Styles for the modal
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
      alignItems: window.innerWidth <= 768 ? 'flex-end' : 'center',
      padding: window.innerWidth <= 768 ? '0' : '20px'
    },
    modal: {
      backgroundColor: '#0d1117',
      borderRadius: window.innerWidth <= 768 ? '12px 12px 0 0' : '12px',
      width: window.innerWidth <= 768 ? '100%' : '90%',
      maxWidth: '1200px',
      height: window.innerWidth <= 768 ? '85vh' : '90vh',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px',
      borderBottom: '1px solid rgba(255, 184, 0, 0.1)',
      background: 'linear-gradient(180deg, rgba(13, 16, 31, 0.98) 0%, rgba(9, 11, 21, 0.96) 100%)'
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      color: '#FFB800',
      fontSize: '20px',
      fontWeight: '600',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    createButton: {
      position: 'absolute',
      right: window.innerWidth <= 768 ? '20px' : '20px',
      top: window.innerWidth <= 768 ? '12px' : '12px',
      background: 'linear-gradient(135deg, #00C851, #00E701)',
      color: '#fff',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: "'Chakra Petch', sans-serif",
      boxShadow: '0 4px 15px rgba(0, 231, 1, 0.2)',
      transition: 'all 0.2s ease',
      zIndex: 10,
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(0, 231, 1, 0.3)'
      }
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#fff',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      right: '20px',
      top: '20px',
      zIndex: 10,
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.1)'
      }
    },
    input: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: '#1A1F2E',
      color: '#fff',
      fontSize: '14px',
      width: '100%'
    },
    select: {
      padding: '10px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      background: '#1A1F2E',
      color: '#fff',
      fontSize: '14px'
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '12px',
      overflowY: 'auto',
      maxHeight: '400px'
    },
    itemCard: {
      background: 'rgba(13, 16, 31, 0.8)',
      borderRadius: '8px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '5px',
      cursor: 'pointer',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    },
    selectedItem: {
      background: 'rgba(255, 184, 0, 0.2)',
      border: '1px solid rgba(255, 184, 0, 0.4)'
    },
    statsBox: {
      display: 'flex',
      gap: '16px',
      padding: '16px',
      background: '#1A1F2E',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.15)'
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '16px 20px',
      borderTop: '1px solid rgba(255, 184, 0, 0.15)'
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  };

  const possibleWinners = getPossibleWinnerCounts();
  const itemsPerWinner = getItemsPerWinner();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      setError('Please select at least one item');
      return;
    }
    
    if (!giveawayTime) {
      setError('Please set a giveaway duration');
      return;
    }
    
    try {
      setCreating(true);
      const result = await createGiveaway({
        items: selectedItems,
        endTimeString: giveawayTime,
        numWinners
      });
      
      console.log('Giveaway created:', result);
      onClose(); // Close modal on success
      
    } catch (err) {
      console.error('Error creating giveaway:', err);
      setError(err.response?.data?.error || 'Failed to create giveaway');
    } finally {
      setCreating(false);
    }
  };

  const modalStyle = {
    ...styles.modal,
    ...(isMobile && {
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
      borderRadius: 0,
    }),
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>
            <span>🎁</span>
            Giveaways
          </div>
          <button style={styles.createButton} onClick={handleSubmit}>
            <span>+</span>
            Create Giveaway
          </button>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'rgba(255, 75, 75, 0.1)',
              border: '1px solid rgba(255, 75, 75, 0.3)',
              color: '#FF4B4B'
            }}>
              {error}
            </div>
          )}

          {/* Giveaway Time */}
          <div>
            <div style={{fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '8px'}}>
              Giveaway Time
            </div>
            <input
              type="text"
              placeholder="Example: in 15s, in 30 seconds, in 10 minutes, in 2 hours, in 1 day"
              value={giveawayTime}
              onChange={(e) => setGiveawayTime(e.target.value)}
              style={styles.input}
            />
            <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px'}}>
              Format: "in X seconds/s/sec" (min 10s), "in X minutes/m/min", "in X hours/h/hr", or "in X days/d" (max 1 day)
            </div>
          </div>

          {/* Item Selection */}
          <div>
            <div style={{fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '8px'}}>
              Select Item
            </div>
            
            <div style={{display: 'flex', gap: '10px', marginBottom: '16px'}}>
              <input
                type="text"
                placeholder="Search for an item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{...styles.input, flex: 1}}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.select}
              >
                <option value="high-low">High - Low</option>
                <option value="low-high">Low - High</option>
              </select>
            </div>

            {/* Stats */}
            <div style={styles.statsBox}>
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: '#00E701', marginBottom: '4px'}}>
                  {selectedItems.length}
                </div>
                <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase'}}>
                  ITEMS
                </div>
              </div>
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FFB800', marginBottom: '4px'}}>
                  💎 {formatValue(calculateTotalValue())}
                </div>
                <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase'}}>
                  WORTH
                </div>
              </div>
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: '#3e9efa', marginBottom: '4px'}}>
                  {numWinners} {itemsPerWinner > 0 && `(${itemsPerWinner} items each)`}
                </div>
                <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase'}}>
                  WINNER{numWinners > 1 ? 'S' : ''}
                </div>
                <div style={{display: 'flex', gap: '5px', marginTop: '5px'}}>
                  <button 
                    style={{
                      background: '#1A1F2E',
                      border: 'none',
                      color: '#fff',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      cursor: possibleWinners.length > 1 ? 'pointer' : 'not-allowed',
                      opacity: possibleWinners.length > 1 ? 1 : 0.5
                    }}
                    onClick={() => {
                      const currentIndex = possibleWinners.indexOf(numWinners);
                      if (currentIndex > 0) {
                        setNumWinners(possibleWinners[currentIndex - 1]);
                      }
                    }}
                    disabled={possibleWinners.indexOf(numWinners) === 0}
                  >
                    -
                  </button>
                  <button 
                    style={{
                      background: '#1A1F2E',
                      border: 'none',
                      color: '#fff',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%', 
                      cursor: possibleWinners.length > 1 ? 'pointer' : 'not-allowed',
                      opacity: possibleWinners.length > 1 ? 1 : 0.5
                    }}
                    onClick={() => {
                      const currentIndex = possibleWinners.indexOf(numWinners);
                      if (currentIndex < possibleWinners.length - 1) {
                        setNumWinners(possibleWinners[currentIndex + 1]);
                      }
                    }}
                    disabled={possibleWinners.indexOf(numWinners) === possibleWinners.length - 1}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Items */}
            {loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid rgba(255, 184, 0, 0.1)',
                  borderTopColor: '#FFB800',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <div>Loading your inventory...</div>
              </div>
            ) : getFilteredAndSortedItems().length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: '#fff',
                fontSize: '18px',
                fontWeight: 'bold',
                gap: '10px'
              }}>
                <div>No Items!</div>
                <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '8px'}}>
                  Your inventory seems to be empty...
                </div>
                <button 
                  style={{
                    padding: '10px 20px',
                    marginTop: '15px',
                    borderRadius: '8px',
                    background: '#1A1F2E',
                    color: '#fff',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  Deposit Items
                </button>
              </div>
            ) : (
              <div 
                style={styles.itemsGrid}
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
                      style={{width: '60px', height: '60px', objectFit: 'contain'}}
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAA70lEQVR4nO3bMQ0AIAxAwQFKHfizQgg4YKQJnL9k086xvPeey3bo5nUAnAkJIyQMIWGEhCEkDCFhCAlDSBhCwhASRkj9OJww01uGkBk/JIyQMELCEBKGkDCEhCEkDCFhCAlDSBhCwggJQ0gYQsIQEoaQMISEISQMIWEICUNIGELCEBKGkDCEhCEkDCFhCAlDSBhCwhASxgkjjB8SRkgYQsIQEoaQMISEISQMIWEICUNIGELCCAlDSBhCwhASRkgYQsIQEoaQMISEISQMIWEICUNIGELCEBKGkDCEhCEkDCFhCAlDSBhCwhASxgkzrw89nwHH54BK9AAAAABJRU5ErkJggg==';
                      }}
                    />
                    <div style={{
                      fontSize: '12px',
                      textAlign: 'center',
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%'
                    }}>
                      {item.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#FFB800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <span>💎</span>
                      {formatValue(item.value || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <button
            style={{
              ...styles.createButton,
              ...(selectedItems.length === 0 || !giveawayTime || creating ? styles.disabledButton : {})
            }}
            disabled={selectedItems.length === 0 || !giveawayTime || creating}
            onClick={handleSubmit}
          >
            {creating ? "Processing..." : "Create Giveaway"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiveawayModal; 