import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { formatValue } from '../utils/formatters';
import { COINFLIP_IMAGES, COINFLIP_SIDES } from '../constants/coinflip'; // Keep sides if needed later, maybe for display
import { IoClose, IoLockClosed, IoLockOpen, IoStar, IoStarOutline, IoFilter } from 'react-icons/io5';
import { FaSort } from 'react-icons/fa';
import { MdAutorenew, MdHistory } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import io from 'socket.io-client';
// import { ObjectId } from 'mongodb'; // REMOVED: Cannot use mongodb package directly in client-side code

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const JoinCoinflipModal = ({ isOpen, onClose, game, onGameJoined }) => {
  const [inventory, setInventory] = useState({
    ps99Items: [],
    mm2Items: [], // Add MM2 if needed
    stats: {
      ps99: { itemCount: 0, totalValue: 0 },
      mm2: { itemCount: 0, totalValue: 0 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('high-low'); // Default sorting
  const [success, setSuccess] = useState('');
  const [currentGameType, setCurrentGameType] = useState('ps99'); // Default or detect from game prop
  const searchInputRef = useRef(null); // Ref for debounced search
  const [filteredItems, setFilteredItems] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lockedItems, setLockedItems] = useState(new Set());
  const [favoriteItems, setFavoriteItems] = useState(new Set());
  const [recentItems, setRecentItems] = useState([]);
  const [valueFilter, setValueFilter] = useState({
    min: '',
    max: '',
    active: false
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/user/current');
        if (response.data.user) {
          setInventory({
            ps99Items: response.data.inventory.ps99Items || [],
            mm2Items: response.data.inventory.mm2Items || [],
            stats: response.data.inventory.stats || {
              ps99: { itemCount: 0, totalValue: 0 },
              mm2: { itemCount: 0, totalValue: 0 }
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

    if (isOpen && game) {
      fetchInventory();
      // Determine game type from the game being joined
      setCurrentGameType(game.gameType || 'ps99');
      // Reset states when modal opens
      setSelectedItems([]);
      setSearchTerm('');
      setSortBy('high-low');
      setError(null);
      setSuccess('');
    }
  }, [isOpen, game]);

  useEffect(() => {
    if (!inventory[currentGameType + 'Items']) return;
    
    let items = [...inventory[currentGameType + 'Items']];
    
    // Apply search filter
    if (searchTerm) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sort
    items.sort((a, b) => {
      if (sortBy === 'high-low') {
        return b.value - a.value;
      } else {
        return a.value - b.value;
      }
    });
    
    setFilteredItems(items);
  }, [inventory, currentGameType, searchTerm, sortBy]);

  // --- Memoized Calculations ---
  const calculateTotalValue = useCallback((itemsToCalculate) => {
    try {
      // Ensure we have a valid array to work with
      if (!Array.isArray(itemsToCalculate) || itemsToCalculate.length === 0) {
        return 0;
      }
      
      return itemsToCalculate.reduce((sum, item) => {
        // Safety checks for the item
        if (!item || typeof item !== 'object') return sum;
        
        // Parse value and quantity with fallbacks
        const itemValue = parseFloat(item.value) || 0;
        const itemQuantity = parseInt(item.quantity) || 1;
        
        return sum + (itemValue * itemQuantity);
      }, 0);
    } catch (error) {
      console.error('Error calculating total value:', error);
      return 0; // Return 0 as fallback value
    }
  }, []);

  const totalSelectedValue = useMemo(() => {
      return calculateTotalValue(selectedItems);
  }, [selectedItems, calculateTotalValue]);

  const isInRange = useMemo(() => {
    if (!game) return false;
    return totalSelectedValue >= game.joinRangeMin && totalSelectedValue <= game.joinRangeMax;
  }, [totalSelectedValue, game]);

  // --- Memoized Handlers ---
  const handleItemSelect = useCallback((item) => {
    try {
      // Validate item before proceeding
      if (!item || typeof item !== 'object' || !item.instanceId) {
        console.error('Invalid item selected:', item);
        return;
      }

    setSelectedItems(prev => {
        // Ensure prev is an array
        const prevItems = Array.isArray(prev) ? prev : [];
        
        const exists = prevItems.some(i => i && i.instanceId === item.instanceId);
        
      if (!exists) {
        // Add to recent items if not already selected
        setRecentItems(prevRecent => {
            try {
              const validRecent = Array.isArray(prevRecent) ? prevRecent : [];
              const newRecent = [item, ...validRecent.filter(i => i && i.instanceId !== item.instanceId)].slice(0, 10);
          return newRecent;
            } catch (error) {
              console.error('Error updating recent items:', error);
              return prevRecent;
            }
        });
      }
        
      if (exists) {
        setError(null);
          return prevItems.filter(i => i && i.instanceId !== item.instanceId);
      } else {
        // Recalculate potential total based on *current* selection + new item
          try {
            const currentTotal = calculateTotalValue(prevItems);
            const itemValue = parseFloat(item.value) || 0;
            const itemQuantity = parseInt(item.quantity) || 1;
            const potentialTotal = currentTotal + (itemValue * itemQuantity);
            
        if (game && potentialTotal > game.joinRangeMax) {
          setError(`Adding this item exceeds the max value of ${formatValue(game.joinRangeMax)}.`);
          setTimeout(() => setError(null), 3000);
              return prevItems;
        }
            
        setError(null);
            return [...prevItems, item];
          } catch (error) {
            console.error('Error calculating item values:', error);
            setError('An error occurred while selecting this item.');
            setTimeout(() => setError(null), 3000);
            return prevItems;
          }
        }
      });
    } catch (error) {
      console.error('Error in handleItemSelect:', error);
      setError('An unexpected error occurred.');
      setTimeout(() => setError(null), 3000);
    }
  }, [game, calculateTotalValue]);

  const handleAutoSelect = useCallback(() => {
    try {
      if (!game) {
        setError('Game data is not available.');
        return;
      }
      
    setError(null);
    setSuccess('');

      // Ensure we have a valid array of items
      if (!Array.isArray(filteredItems) || filteredItems.length === 0) {
        setError('No items available to select.');
        return;
      }

      // Filter out invalid or locked items
      const availableItems = filteredItems.filter(item => 
        item && 
        typeof item === 'object' && 
        item.instanceId && 
        !lockedItems.has(item.instanceId)
      );
      
      if (availableItems.length === 0) {
        setError('No available items found that are not locked.');
        return;
      }

      const targetMax = game.joinRangeMax || 0;
      const targetMin = game.joinRangeMin || 0;
    let currentSelectedValue = 0;
    let autoSelected = [];

    // First try to use favorite items
    const favoriteItemsSorted = availableItems
      .filter(item => favoriteItems.has(item.instanceId))
        .sort((a, b) => {
          const aValue = parseFloat(a.value) || 0;
          const bValue = parseFloat(b.value) || 0;
          return bValue - aValue;
        });

    for (const item of favoriteItemsSorted) {
        const itemValue = parseFloat(item.value) || 0;
        const itemQuantity = parseInt(item.quantity) || 1;
        
        if (currentSelectedValue + (itemValue * itemQuantity) <= targetMax) {
        autoSelected.push(item);
          currentSelectedValue += (itemValue * itemQuantity);
      }
    }

    // If we still need more value, use non-favorite items
    if (currentSelectedValue < targetMin) {
      const nonFavoriteItemsSorted = availableItems
        .filter(item => !favoriteItems.has(item.instanceId))
          .sort((a, b) => {
            const aValue = parseFloat(a.value) || 0;
            const bValue = parseFloat(b.value) || 0;
            return bValue - aValue;
          });

      for (const item of nonFavoriteItemsSorted) {
          const itemValue = parseFloat(item.value) || 0;
          const itemQuantity = parseInt(item.quantity) || 1;
          
          if (currentSelectedValue + (itemValue * itemQuantity) <= targetMax) {
            autoSelected.push(item);
            currentSelectedValue += (itemValue * itemQuantity);
        }
        }
    }

    if (currentSelectedValue >= targetMin) {
        setSelectedItems(autoSelected);
        setSuccess(`Auto-selected items worth ${formatValue(currentSelectedValue)}.`);
             setTimeout(() => setSuccess(''), 3000);
        } else {
             setSelectedItems([]);
             setError('Could not auto-select items within the required range.');
             setTimeout(() => setError(null), 3000);
        }
    } catch (error) {
      console.error('Error in handleAutoSelect:', error);
      setError('An error occurred while auto-selecting items.');
      setTimeout(() => setError(null), 3000);
    }
  }, [game, filteredItems, lockedItems, favoriteItems]);

  // --- Debounced Search Handler ---
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300), // 300ms debounce delay
    [] // No dependencies, debounce function is stable
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  useEffect(() => {
    // Reset joining state when modal closes
    if (!isOpen) {
      setIsJoining(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const savedLocked = JSON.parse(localStorage.getItem('lockedItems') || '[]');
      const savedFavorites = JSON.parse(localStorage.getItem('favoriteItems') || '[]');
      const savedRecent = JSON.parse(localStorage.getItem('recentItems') || '[]');
      
      setLockedItems(new Set(savedLocked));
      setFavoriteItems(new Set(savedFavorites));
      setRecentItems(savedRecent.slice(0, 10)); // Keep last 10 items
    }
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('lockedItems', JSON.stringify([...lockedItems]));
  }, [lockedItems]);

  useEffect(() => {
    localStorage.setItem('favoriteItems', JSON.stringify([...favoriteItems]));
  }, [favoriteItems]);

  useEffect(() => {
    localStorage.setItem('recentItems', JSON.stringify(recentItems));
  }, [recentItems]);

  // Handle item lock/unlock
  const toggleItemLock = useCallback((item, event) => {
    event.stopPropagation(); // Prevent item selection
    setLockedItems(prev => {
      const newLocked = new Set(prev);
      if (newLocked.has(item.instanceId)) {
        newLocked.delete(item.instanceId);
      } else {
        newLocked.add(item.instanceId);
      }
      return newLocked;
    });
  }, []);

  // Handle item favorite
  const toggleItemFavorite = useCallback((item, event) => {
    event.stopPropagation(); // Prevent item selection
    setFavoriteItems(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(item.instanceId)) {
        newFavorites.delete(item.instanceId);
      } else {
        newFavorites.add(item.instanceId);
      }
      return newFavorites;
    });
  }, []);

  // Filter items based on value range
  const applyValueFilter = useCallback((items) => {
    if (!valueFilter.active) return items;
    
    return items.filter(item => {
      const value = item.value;
      const min = valueFilter.min ? parseFloat(valueFilter.min) : -Infinity;
      const max = valueFilter.max ? parseFloat(valueFilter.max) : Infinity;
      return value >= min && value <= max;
    });
  }, [valueFilter]);

  // Modified useEffect for filtering items
  useEffect(() => {
    try {
      // Ensure the inventory data exists and is properly structured
      const itemsArray = Array.isArray(inventory[currentGameType + 'Items']) 
        ? inventory[currentGameType + 'Items'] 
        : [];
      
      let items = [...itemsArray];
      
      // Apply search filter safely
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase().trim();
      items = items.filter(item => 
          item && item.name && typeof item.name === 'string' && 
          item.name.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply value filter with safety checks
      if (valueFilter.active) {
        items = items.filter(item => {
          if (!item || typeof item !== 'object') return false;
          
          const itemValue = parseFloat(item.value) || 0;
          const min = valueFilter.min ? parseFloat(valueFilter.min) : -Infinity;
          const max = valueFilter.max ? parseFloat(valueFilter.max) : Infinity;
          
          return !isNaN(itemValue) && !isNaN(min) && !isNaN(max) && 
                 itemValue >= min && itemValue <= max;
        });
      }
      
      // Apply sort with safety checks
    items.sort((a, b) => {
        // Null check for both items
        if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return 0;
        
      // First sort by favorite status
        const aFavorite = favoriteItems.has(a.instanceId);
        const bFavorite = favoriteItems.has(b.instanceId);
        if (aFavorite && !bFavorite) return -1;
        if (!aFavorite && bFavorite) return 1;
      
      // Then by value
        const aValue = parseFloat(a.value) || 0;
        const bValue = parseFloat(b.value) || 0;
        
      if (sortBy === 'high-low') {
          return bValue - aValue;
      } else {
          return aValue - bValue;
      }
    });
    
    setFilteredItems(items);
    } catch (error) {
      console.error('Error filtering or sorting items:', error);
      setFilteredItems([]);
    }
  }, [inventory, currentGameType, searchTerm, sortBy, valueFilter, favoriteItems]);

  const handleJoinGame = async () => {
    if (isJoining || isProcessing) return;
    
    // Socket setup for emitting events - use relative path which will be proxied
    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
      console.log('JoinCoinflipModal socket connected successfully');
    });
    
    socket.on('connect_error', (error) => {
      console.error('JoinCoinflipModal socket connection error:', error);
    });
    
    try {
      setIsJoining(true);
      setError(null);
      
      // First check if someone else is already joining
      const checkResponse = await axios.post('/api/coinflip/check-join', {
        gameId: game._id
      });
      
      if (checkResponse.data.isBeingJoined) {
        const status = checkResponse.data.status;
        let errorMessage = 'Someone else is currently joining this game!';
        
        // Use the status to provide more specific error messages
        switch(status) {
          case 'has_joiner':
            errorMessage = 'This game has already been joined.';
            break;
          case 'unavailable':
            errorMessage = 'This game is no longer available for joining.';
            break;
          case 'being_joined':
            errorMessage = 'Someone else is currently joining this game. Please try another game.';
            break;
          default:
            errorMessage = 'This game cannot be joined at this time.';
        }
        
        toast.error(errorMessage, {
          position: 'top-center',
          autoClose: 3000
        });
        setIsJoining(false);
        return;
      }

      // Start processing the join
      setIsProcessing(true);

      // Get current user's info from session
      const userResponse = await axios.get('/api/session/check');
      const userData = userResponse.data?.userInfo || {};
      
      // Use the avatar that's already stored in the session
      const joinerAvatar = userData.avatar;
      
      console.log("Joining game with user:", userData);
      console.log("Using existing joiner avatar:", joinerAvatar);

      const joinResponse = await axios.post('/api/coinflip/join', {
        gameId: game._id,
        items: selectedItems.map(item => ({
          instanceId: item.instanceId,
          value: item.value,
          name: item.name,
          image: item.image,
          type: "pet",
          game: 'ps99',
          quantity: item.quantity || 1,
          addedAt: item.addedAt || new Date()
        }))
      });

      if (joinResponse.data.success) {
        // Connect to the specific game room to ensure viewers get updates
        socket.emit('join_game_room', { gameId: game._id });

        // Build the game data to emit
        const gameJoinedData = {
          gameId: game._id,
          _id: game._id,
          joinerAvatar: joinerAvatar, // Use the avatar from the user's session
          joinerName: userData.name || 'Unknown',
          joiner: userData.id,
          winner: joinResponse.data.game.winner,
          winningSide: joinResponse.data.game.winningSide,
          value: game.value,
          totalValue: game.value + selectedItems.reduce((sum, item) => sum + item.value, 0),
          creatorItems: game.creatorItems,
          joinerItems: selectedItems,
          creatorSide: game.creatorSide,
          joinerSide: game.creatorSide === 'heads' ? 'tails' : 'heads',
          creatorAvatar: game.creatorAvatar,
          creatorName: game.creatorName,
          creator: game.creator,
          state: 'ended',
          endedAt: new Date(),
          joinRangeMin: game.joinRangeMin,
          joinRangeMax: game.joinRangeMax,
          normalizedResult: joinResponse.data.game.normalizedResult
        };

        // Emit the game_joined event globally and to the specific room
        console.log("Emitting game_joined event with joiner info:", {
          joinerId: userData.id,
          joinerName: userData.name,
          joinerAvatar: joinerAvatar
        });

        socket.emit('game_joined', gameJoinedData);

        setSuccess('Successfully joined the game!');
        
        // Call the onGameJoined prop with the game data if it exists
        if (onGameJoined && typeof onGameJoined === 'function') {
          // Pass the complete game data to parent component
          onGameJoined(gameJoinedData);
        }
        
        // Close this modal after a short delay
        setTimeout(() => {
          onClose();
        }, 500);
      }

    } catch (error) {
      console.error('Error joining game:', error);
      
      // Always emit join_failure event to reset join state on server
      // Include the specific error message
      socket.emit('join_failure', {
        gameId: game._id,
        error: error.response?.data?.message || 'Failed to join game'
      });
      
      setError(error.response?.data?.message || 'Failed to join game');
      toast.error(error.response?.data?.message || 'Failed to join game', {
        position: 'top-center',
        autoClose: 3000
      });
    } finally {
      setIsJoining(false);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !game) return null;

  // Dark Blue / Golden Theme Styles (Adapted from CreateCoinflip)
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 16, 31, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'linear-gradient(180deg, rgba(13, 16, 31, 0.95) 0%, rgba(13, 16, 31, 0.98) 100%)',
      borderRadius: '12px',
      padding: '24px',
      width: '90%',
      maxWidth: '1200px',
      height: '700px',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '0 0 20px 0',
      borderBottom: '1px solid rgba(255, 184, 0, 0.1)',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #FFB800 0%, #FFDB1C 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    valueRange: {
      fontSize: '16px',
      color: '#FFB800',
      opacity: 0.9,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#FFB800',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '4px',
      transition: 'transform 0.2s ease',
      '&:hover': {
        transform: 'rotate(90deg)',
      }
    },
    searchContainer: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
    },
    searchInput: {
      flex: 1,
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: 'rgba(13, 16, 31, 0.6)',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      color: '#fff',
      fontSize: '16px',
      transition: 'border-color 0.2s ease',
      '&:focus': {
        borderColor: '#FFB800',
        outline: 'none',
      }
    },
    sortButton: {
      padding: '12px 24px',
      borderRadius: '8px',
      backgroundColor: 'rgba(13, 16, 31, 0.6)',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      color: '#FFB800',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      minWidth: '150px',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
      }
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: '12px',
      overflowY: 'auto',
      flex: 1,
      padding: '4px',
      marginBottom: '20px',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'rgba(13, 16, 31, 0.6)',
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
    itemCard: {
      backgroundColor: 'rgba(13, 16, 31, 0.6)',
      borderRadius: '8px',
      padding: '12px',
      cursor: 'pointer',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(255, 184, 0, 0.15)',
      }
    },
    itemCardSelected: {
      border: '1px solid #FFB800',
      backgroundColor: 'rgba(255, 184, 0, 0.1)',
      boxShadow: '0 0 15px rgba(255, 184, 0, 0.2)',
    },
    itemImage: {
      width: '100%',
      height: '120px',
      objectFit: 'contain',
      marginBottom: '8px',
      borderRadius: '4px',
      backgroundColor: 'rgba(13, 16, 31, 0.4)',
    },
    itemName: {
      fontSize: '14px',
      color: '#fff',
      marginBottom: '4px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    itemValue: {
      fontSize: '14px',
      color: '#FFB800',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    bottomBar: {
      borderTop: '1px solid rgba(255, 184, 0, 0.15)',
      padding: '20px 0 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'linear-gradient(180deg, rgba(13, 16, 31, 0) 0%, rgba(13, 16, 31, 0.98) 100%)',
    },
    selectedValue: {
      color: '#FFB800',
      fontSize: '16px',
      fontWeight: 'bold',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
    },
    autoSelectButton: {
      padding: '12px 24px',
      borderRadius: '8px',
      backgroundColor: 'rgba(13, 16, 31, 0.6)',
      border: '1px solid #FFB800',
      color: '#FFB800',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      position: 'relative',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
      }
    },
    joinButton: {
      padding: '12px 48px',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #FFB800 0%, #FFDB1C 100%)',
      border: 'none',
      color: '#000',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(255, 184, 0, 0.3)',
      },
      '&:disabled': {
        background: 'linear-gradient(135deg, #4A4A4A 0%, #2A2A2A 100%)',
        color: '#666',
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'none',
      }
    },
    newBadge: {
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      backgroundColor: '#FFB800',
      color: '#000',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: 'bold',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    },
    messageContainer: {
      padding: '12px 0',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '40px',
    },
    messageBase: {
      padding: '10px 20px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      fontSize: '14px',
      maxWidth: '90%',
      backgroundColor: 'rgba(13, 16, 31, 0.6)',
    },
    successMessage: {
      border: '1px solid rgba(46, 204, 113, 0.5)',
      color: '#2ecc71',
    },
    errorMessage: {
      border: '1px solid rgba(231, 76, 60, 0.5)',
      color: '#e74c3c',
    },
    messageIcon: { // Style for the icon itself
        fontSize: '20px',
        lineHeight: '1' // Ensure icon aligns well vertically
    },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 12, 20, 0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    loadingContent: { textAlign: 'center', color: '#FFD700' },
    loadingSpinner: { border: '4px solid rgba(255, 215, 0, 0.3)', borderTop: '4px solid #FFD700', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' },
    // Keyframes for spinner
    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
  };

  // Inject keyframes for spinner
  const styleSheet = document.styleSheets[0];
  if (styleSheet) {
      try {
        styleSheet.insertRule(`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`, styleSheet.cssRules.length);
      } catch (e) {
          // Ignore if rule already exists or other CSSOM issues
          // console.warn("Could not insert @keyframes: ", e);
      }
  }

  // Add result display styles
  const resultStyles = {
    resultOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 16, 31, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
    },
    resultContainer: {
      textAlign: 'center',
      padding: '32px',
      borderRadius: '16px',
      border: '2px solid #FFB800',
      backgroundColor: 'rgba(13, 16, 31, 0.9)',
      maxWidth: '400px',
    },
    winnerText: {
      fontSize: '24px',
      color: '#FFB800',
      marginBottom: '16px',
      fontWeight: 'bold',
    },
    sideResult: {
      fontSize: '36px',
      color: '#FFB800',
      margin: '24px 0',
      fontWeight: 'bold',
    },
    seedInfo: {
      fontSize: '14px',
      color: '#8b949e',
      marginTop: '16px',
      wordBreak: 'break-all',
    }
  };

  // Add these styles to your existing styles object
  const additionalStyles = {
    itemActions: {
      position: 'absolute',
      top: '4px',
      right: '4px',
      display: 'flex',
      gap: '4px',
      zIndex: 1
    },
    actionButton: {
      background: 'rgba(13, 16, 31, 0.8)',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      borderRadius: '4px',
      padding: '4px',
      cursor: 'pointer',
      color: '#FFB800',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: 'rgba(255, 184, 0, 0.2)',
      }
    },
    filterPanel: {
      padding: '12px',
      background: 'rgba(13, 16, 31, 0.9)',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      borderRadius: '8px',
      marginBottom: '12px',
      display: showFilters ? 'grid' : 'none',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px'
    },
    filterInput: {
      padding: '8px 12px',
      borderRadius: '4px',
      backgroundColor: 'rgba(13, 16, 31, 0.6)',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      color: '#fff',
      fontSize: '14px'
    },
    recentSection: {
      marginTop: '12px',
      padding: '12px',
      background: 'rgba(13, 16, 31, 0.6)',
      borderRadius: '8px',
      display: recentItems.length > 0 ? 'block' : 'none'
    },
    recentTitle: {
      fontSize: '14px',
      color: '#FFB800',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    recentGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: '8px'
    },
    recentItem: {
      width: '80px',
      height: '80px',
      objectFit: 'contain',
      borderRadius: '4px',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      padding: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'scale(1.05)',
        borderColor: '#FFB800'
      }
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {showResult && gameResult && (
          <div style={resultStyles.resultOverlay}>
            <div style={resultStyles.resultContainer}>
              <div style={resultStyles.winnerText}>
                {gameResult.winner === game.creator ? 'Creator' : 'Joiner'} Won!
              </div>
              <div style={resultStyles.sideResult}>
                {gameResult.winningSide.toUpperCase()}
              </div>
              <div style={resultStyles.seedInfo}>
                <div>Server Seed: {gameResult.serverSeed}</div>
                <div>Random Seed: {gameResult.randomSeed}</div>
                <div>Result: {gameResult.normalizedResult}</div>
              </div>
            </div>
          </div>
        )}
        
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Select Items</div>
            <div style={styles.valueRange}>
              Value Range: R${formatValue(game.joinRangeMin)} - R${formatValue(game.joinRangeMax)}
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <IoClose />
          </button>
        </div>

        {(success || error) && (
          <div style={styles.messageContainer}>
            <div style={{...styles.messageBase, ...(success ? styles.successMessage : styles.errorMessage)}}>
              <span style={styles.messageIcon}>{success ? '✅' : '❌'}</span>
              <span>{success || error}</span>
            </div>
          </div>
        )}
        {!(success || error) && <div style={styles.messageContainer}></div>}

        {loading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingContent}>
              <div style={styles.loadingSpinner} />
              <div>Loading Inventory...</div>
            </div>
          </div>
        )}

        <div style={styles.searchContainer}>
            <input
            ref={searchInputRef}
              type="text"
              placeholder={`Search your ${currentGameType.toUpperCase()} items...`}
              onChange={handleSearchChange}
              style={styles.searchInput}
            />
          <button 
            style={styles.sortButton}
            onClick={() => setShowFilters(prev => !prev)}
          >
            <IoFilter /> Filters
          </button>
          <button 
            style={styles.sortButton}
            onClick={() => setSortBy(prev => prev === 'high-low' ? 'low-high' : 'high-low')}
          >
            <FaSort /> {sortBy === 'high-low' ? 'High to Low' : 'Low to High'}
          </button>
        </div>

        {/* Value Filter Panel */}
        <div style={additionalStyles.filterPanel}>
          <input
            type="number"
            placeholder="Min Value"
            style={additionalStyles.filterInput}
            value={valueFilter.min}
            onChange={e => setValueFilter(prev => ({
              ...prev,
              min: e.target.value,
              active: Boolean(e.target.value || prev.max)
            }))}
          />
          <input
            type="number"
            placeholder="Max Value"
            style={additionalStyles.filterInput}
            value={valueFilter.max}
            onChange={e => setValueFilter(prev => ({
              ...prev,
              max: e.target.value,
              active: Boolean(e.target.value || prev.min)
            }))}
          />
        </div>

        {/* Recent Items Section */}
        {recentItems.length > 0 && (
          <div style={additionalStyles.recentSection}>
            <div style={additionalStyles.recentTitle}>
              <MdHistory /> Recently Used Items
            </div>
            <div style={additionalStyles.recentGrid}>
              {recentItems.map(item => (
                <img
                  key={item.instanceId}
                  src={item.image}
                  alt={item.name}
                  style={additionalStyles.recentItem}
                  onClick={() => handleItemSelect(item)}
                  title={`${item.name} - ${formatValue(item.value)}`}
                />
              ))}
            </div>
          </div>
        )}

            <div style={styles.itemsGrid}>
              {(() => {
                try {
                  // If there are no items, show a message
                  if (!Array.isArray(filteredItems) || filteredItems.length === 0) {
                    if (loading) return null;
                    return (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#aaa', marginTop: '20px' }}>
                        No items found matching your criteria.
                      </div>
                    );
                  }
                  
                  // Render the items
                  return filteredItems.map((item) => {
                    if (!item || !item.instanceId) return null;
                    
                    return (
                <div
              key={item.instanceId}
                  style={{
                    ...styles.itemCard,
                ...(selectedItems.some(i => i.instanceId === item.instanceId) ? styles.itemCardSelected : {}),
                position: 'relative'
                  }}
                  onClick={() => handleItemSelect(item)}
            >
              <div style={additionalStyles.itemActions}>
                <button
                  style={additionalStyles.actionButton}
                  onClick={(e) => toggleItemLock(item, e)}
                  title={lockedItems.has(item.instanceId) ? 'Unlock item' : 'Lock item'}
                >
                  {lockedItems.has(item.instanceId) ? <IoLockClosed /> : <IoLockOpen />}
                </button>
                <button
                  style={additionalStyles.actionButton}
                  onClick={(e) => toggleItemFavorite(item, e)}
                  title={favoriteItems.has(item.instanceId) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {favoriteItems.has(item.instanceId) ? <IoStar /> : <IoStarOutline />}
                </button>
              </div>
                        <img 
                          src={item.image || ''}
                          alt={item.name || 'Item'} 
                          style={styles.itemImage}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/100?text=Image+Error';
                          }}
                        />
                        <div style={styles.itemName}>{item.name || 'Unknown Item'}</div>
                  <div style={styles.itemValue}>
                    <span>💎</span>
                          {formatValue(parseFloat(item.value) || 0)}
                  </div>
                </div>
                    );
                  });
                } catch (error) {
                  console.error('Error rendering items:', error);
                  return (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#ff6b6b', marginTop: '20px' }}>
                      An error occurred while displaying items. Please try again.
                </div>
                  );
                }
              })()}
        </div>

        <div style={styles.bottomBar}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <div style={styles.selectedValue}>
                   Selected: R${formatValue(totalSelectedValue)}
               </div>
              <button
                  style={styles.autoSelectButton}
                  onClick={handleAutoSelect}
                  disabled={loading}
              >
              <MdAutorenew /> Auto Select
                  <span style={styles.newBadge}>NEW</span>
              </button>
           </div>
          <button
            style={{
              ...styles.joinButton,
              ...(!isInRange && styles.joinButton['&:disabled'])
            }}
            disabled={!isInRange || selectedItems.length === 0 || isJoining || isProcessing}
            onClick={handleJoinGame}
          >
            {isJoining || isProcessing ? 'Processing...' : `Continue with R$${formatValue(totalSelectedValue)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCoinflipModal; 