import React, { useState, useEffect, useRef } from 'react';
import { formatValue } from '../utils/formatters';
import { HEADS_IMAGE_URL, TAILS_IMAGE_URL } from '../utils/coinflipAssets';
import { socket } from '../socket'; // Make sure you have this socket connection file
import { toast } from 'react-hot-toast';
import axios from 'axios';

// Add these functions to help with socket connection management
const ensureSocketConnection = () => {
  // Connect the socket if it's not already connected
  if (!socket.connected) {
    console.log('Socket not connected, connecting now...');
    socket.connect();
  }
};

// Add socket connection error handling
socket.on('connect_error', (error) => {
  console.error('Socket connection error in CoinflipViewModal:', error);
  toast.error('Connection error. Reconnecting...');
  
  // Attempt to reconnect after a delay
  setTimeout(() => {
    ensureSocketConnection();
  }, 2000);
});

const CoinflipViewModal = ({ isOpen, onClose, game, onGameCancelled }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [coinAnimationState, setCoinAnimationState] = useState('idle'); // idle, flipping, done
  const [creatorAvatar, setCreatorAvatar] = useState(null);
  const [joinerAvatar, setJoinerAvatar] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [showResult, setShowResult] = useState(false);
  const [gameData, setGameData] = useState(game);
  
  const coinRef = useRef(null);
  
  // Update the isGameCompleted check to use both local state and props
  // This ensures we can correctly determine if a game is completed
  const isGameCompleted = (() => {
    // First check the local gameData state
    if (gameData && gameData.winner && gameData.winningSide) {
      return true;
    }
    
    // Then check the original props in case gameData hasn't been updated yet
    if (game && game.winner && game.winningSide) {
      return true;
    }
    
    return false;
  })();
  
  // Calculate total pot value (creator + joiner items)
  const totalPotValue = gameData ? 
    (gameData.value || 0) + (gameData.joinerItems?.reduce((sum, item) => sum + Number(item.value), 0) || 0) : 0;
  
  // Calculate accurate percentages
  const creatorPercentage = totalPotValue > 0 ? 
    Math.round((gameData?.value / totalPotValue) * 100) : 100;
  const joinerPercentage = totalPotValue > 0 ? 
    100 - creatorPercentage : 0;

  // Reset canceling state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsCanceling(false);
      setCoinAnimationState('idle');
      setCountdown(3);
      setShowResult(false);
    } else if (isOpen && isGameCompleted) {
      // Start with countdown animation
      setCoinAnimationState('loading');
      setCountdown(3);
      setShowResult(false);
      
      // Countdown from 3 to 1
      const timer1 = setTimeout(() => setCountdown(2), 1000);
      const timer2 = setTimeout(() => setCountdown(1), 2000);
      
      // After 3 seconds, show the result
      const timer3 = setTimeout(() => {
        setCoinAnimationState('done');
        setShowResult(true);
      }, 3000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen, isGameCompleted]);

  // Fetch avatars when the modal opens and game data is available
  useEffect(() => {
    if (isOpen && gameData) {
      console.log("Game data in modal:", gameData);
      console.log("Creator ID:", gameData.creator);
      console.log("Creator avatar from db:", gameData.creatorAvatar);
      console.log("Joiner ID:", gameData.joiner);
      console.log("Joiner avatar from db:", gameData.joinerAvatar);
    }
  }, [isOpen, gameData]);

  useEffect(() => {
    // Listen for game cancellation confirmation
    const handleGameCancelled = (data) => {
      // Ensure we have both the game data and matching IDs
      if (!gameData || !data || !data.gameId || !(gameData.id || gameData._id)) {
        console.error('Invalid game data in cancellation handler');
        return;
      }

      const gameId = gameData.id || gameData._id;
      if (data.gameId === gameId) {
        setIsCanceling(false);
        // Only close if not already closed by API response
        if (isOpen) {
          onClose();
          if (onGameCancelled) {
            onGameCancelled(data);
          }
        }
      }
    };

    // Listen for user value updates
    const handleUserValueUpdate = (data) => {
      if (userInfo && data && data.userId === userInfo.id) {
        setUserInfo(prev => ({
          ...prev,
          totalValue: data.totalValue
        }));
      }
    };

    // Only set up socket listeners if modal is open and we have game data
    if (isOpen && gameData && (gameData.id || gameData._id)) {
      // Clean up any existing listeners first
      socket.off('game_cancelled', handleGameCancelled);
      socket.off('user_value_update', handleUserValueUpdate);
      
      // Set up new listeners
      socket.on('game_cancelled', handleGameCancelled);
      socket.on('user_value_update', handleUserValueUpdate);
    }

    return () => {
      // Clean up listeners when component unmounts or dependencies change
      socket.off('game_cancelled', handleGameCancelled);
      socket.off('user_value_update', handleUserValueUpdate);
    };
  }, [isOpen, gameData, userInfo, onClose, onGameCancelled]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/session/check', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        const data = await response.json();
        if (data.userInfo) {
          setUserInfo({
            ...data.userInfo,
            id: data.userInfo.id
          });
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    if (isOpen) {
      fetchUserInfo();
    }
  }, [isOpen]);

  // Update the getCreatorStyle and getJoinerStyle functions to use the showResult state
  const getCreatorStyle = () => {
    if (!isGameCompleted || !showResult) return {};
    return {
      borderColor: isCreatorWinner ? '#4CAF50' : '#FF5252',
      boxShadow: isCreatorWinner ? '0 0 20px rgba(76, 175, 80, 0.5)' : '0 0 20px rgba(255, 82, 82, 0.5)'
    };
  };

  const getJoinerStyle = () => {
    if (!isGameCompleted || !showResult) return {};
    return {
      borderColor: isCreatorWinner ? '#FF5252' : '#4CAF50',
      boxShadow: isCreatorWinner ? '0 0 20px rgba(255, 82, 82, 0.5)' : '0 0 20px rgba(76, 175, 80, 0.5)'
    };
  };

  // Also add a socket listener to track join failures and reset the "someone is joining" state
  useEffect(() => {
    // Ensure socket is connected
    if (!socket.connected) {
      console.log('Socket not connected in CoinflipViewModal, connecting now...');
      socket.connect();
    }

    // Socket connection event listeners
    const handleSocketConnection = () => {
      console.log('Socket connected in CoinflipViewModal');
    };

    const handleSocketDisconnection = (reason) => {
      console.error('Socket disconnected in CoinflipViewModal:', reason);
      // Try to reconnect
      setTimeout(() => {
        if (!socket.connected) {
          console.log('Attempting to reconnect socket...');
          socket.connect();
        }
      }, 2000);
    };

    // Listen for join failures to reset the blocking state
    const handleJoinFailure = (data) => {
      if (data && data.gameId && gameData && (gameData.id === data.gameId || gameData._id === data.gameId)) {
        console.log("Join attempt failed, resetting join state for game:", data.gameId);
        // This will reset the state on the server, allowing others to try joining
        socket.emit('reset_join_state', { gameId: data.gameId });
      }
    };

    // Listen for join state resets
    const handleJoinStateReset = (data) => {
      if (data && data.gameId && gameData && (gameData.id === data.gameId || gameData._id === data.gameId)) {
        console.log("Join state reset for game:", data.gameId);
        // No need to emit anything, server has already reset the state
      }
    };

    if (isOpen && gameData) {
      socket.on('join_failure', handleJoinFailure);
      socket.on('join_state_reset', handleJoinStateReset);
      
      return () => {
        socket.off('join_failure', handleJoinFailure);
        socket.off('join_state_reset', handleJoinStateReset);
      };
    }
    
    return () => {
      socket.off('join_failure', handleJoinFailure);
      socket.off('join_state_reset', handleJoinStateReset);
    };
  }, [isOpen, gameData]);

  // Set up socket connection at the top of the component
  // This ensures we have consistent access to the socket throughout the component
  useEffect(() => {
    if (!isOpen || !game) return;
    
    const gameId = game.id || game._id;
    console.log("🌐 Setting up socket connection for game:", gameId);
    
    // Make sure socket is connected before joining room
    if (!socket.connected) {
      socket.connect();
    }
    
    // Join the game room to receive updates
    socket.emit('join_game_room', { gameId });
    
    // Clean up function to leave the room when component unmounts
    return () => {
      console.log("🌐 Cleaning up socket connection for game:", gameId);
      socket.emit('leave_game_room', { gameId });
    };
  }, [isOpen, game]);

  // Make sure the socket listener is set up before any other socket-related effects
  useEffect(() => {
    const handleSocketConnection = () => {
      console.log("🌐 Socket connected");
    };
    
    const handleSocketDisconnection = (reason) => {
      console.log("🌐 Socket disconnected:", reason);
      
      // Reconnect if disconnected
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log("🌐 Reconnecting socket...");
        socket.connect();
      }
    };
    
    socket.on('connect', handleSocketConnection);
    socket.on('disconnect', handleSocketDisconnection);
    socket.on('connect_error', (error) => {
      console.error("🌐 Socket connection error:", error);
    });
    
    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }
    
    return () => {
      socket.off('connect', handleSocketConnection);
      socket.off('disconnect', handleSocketDisconnection);
      socket.off('connect_error');
    };
  }, []);

  // Helper function for comparing IDs safely
  const isSameGame = (gameA, gameB) => {
    if (!gameA || !gameB) return false;
    
    const idA = gameA.id || gameA._id;
    const idB = gameB.gameId || gameB._id;
    
    if (!idA || !idB) return false;
    
    // Convert both to strings for safe comparison
    return String(idA) === String(idB);
  };

  // Use this helper in our event handler
  const handleGameJoined = (data) => {
    console.log("✅ GAME JOINED EVENT RECEIVED", data);
    console.log("Current game ID:", game?.id || game?._id);
    console.log("Joined game ID:", data?.gameId || data?._id);
    
    if (!game || !data) return;
    
    // Use our safe comparison function
    if (isSameGame(game, data)) {
      console.log("🎮 THIS IS OUR GAME! Updating view with:", data);
      
      // Create an updated game object
      const updatedGame = {
        ...game, // Use the original game as base
        state: 'ended',
        joiner: data.joiner,
        joinerName: data.joinerName,
        joinerAvatar: data.joinerAvatar,
        joinerItems: data.joinerItems || [],
        winner: data.winner,
        winningSide: data.winningSide,
        endedAt: data.endedAt || new Date(),
        totalValue: data.totalValue
      };
      
      // Update the local game state
      console.log("Setting gameData to:", updatedGame);
      setGameData(updatedGame);
      
      // Start the animation sequence
      setCoinAnimationState('loading');
      setCountdown(3);
      setShowResult(false);
      
      setTimeout(() => setCountdown(2), 1000);
      setTimeout(() => setCountdown(1), 2000);
      setTimeout(() => {
        setCoinAnimationState('done');
        setShowResult(true);
      }, 3000);
    }
  };

  // Add a proper useEffect to update gameData when the game prop changes
  useEffect(() => {
    if (game) {
      setGameData(game);
    }
  }, [game]);

  // Reset gameData when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGameData(null);
    }
  }, [isOpen]);

  // Add debugging - log initial game state
  useEffect(() => {
    if (isOpen && game) {
      console.log("CoinflipViewModal opened with game:", game);
      console.log("Game state:", game.state);
      console.log("Game has winner:", !!game.winner);
    }
  }, [isOpen, game]);

  // Add monitoring for gameData changes
  useEffect(() => {
    if (gameData) {
      console.log("gameData updated:", gameData);
      console.log("Game state:", gameData.state);
      console.log("Game has winner:", !!gameData.winner);
      
      // If the game is completed, start the animation process
      if (gameData.state === 'ended' && gameData.winner && gameData.winningSide && coinAnimationState === 'idle') {
        console.log("Starting animation for completed game");
        
        // Start animation process
        setCoinAnimationState('loading');
        setCountdown(3);
        setShowResult(false);
        
        // Start countdown animation
        setTimeout(() => setCountdown(2), 1000);
        setTimeout(() => setCountdown(1), 2000);
        setTimeout(() => {
          setCoinAnimationState('done');
          setShowResult(true);
        }, 3000);
      }
    }
  }, [gameData, coinAnimationState]);

  // Initialize gameData when component is first opened
  useEffect(() => {
    if (isOpen && game) {
      console.log("🎮 CoinflipViewModal opened with game:", game);
      console.log("Game state:", game.state);
      setGameData(game);
    }
  }, [isOpen, game]);

  // Set up game_joined listener
  useEffect(() => {
    if (!isOpen) return;
    
    // Remove any existing listeners to prevent duplicates
    socket.off('game_joined', handleGameJoined);
    
    // Add the listener
    socket.on('game_joined', handleGameJoined);
    
    return () => {
      socket.off('game_joined', handleGameJoined);
    };
  }, [isOpen, game]);

  if (!isOpen || !gameData) return null;

  // Coin animation class for completed games
  const coinAnimationClass = (() => {
    if (!gameData || !isGameCompleted) return '';
    
    switch (coinAnimationState) {
      case 'flipping':
        return 'coin-flipping';
      case 'done':
        return gameData.winningSide === 'heads' ? 'coin-heads' : 'coin-tails';
      default:
        return '';
    }
  })();
  
  // Determine winner and loser styling for completed games
  const isCreatorWinner = gameData.winner === gameData.creator;
  
  // Simplified avatar handling - use exactly what's in the database
  const displayCreatorAvatar = gameData.creatorAvatar || 'https://tr.rbxcdn.com/30dab1a854a6f3e8ebab500cc3de87a8/150/150/AvatarHeadshot/Png';
  const displayJoinerAvatar = gameData.joinerAvatar || 'https://tr.rbxcdn.com/30dab1a854a6f3e8ebab500cc3de87a8/150/150/AvatarHeadshot/Png';

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 17, 23, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
    },
    modal: {
      width: '95%',
      maxWidth: '1200px',
      backgroundColor: '#0d1117',
      borderRadius: '16px',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      position: 'relative',
    },
    header: {
      padding: '24px',
      borderBottom: '1px solid rgba(255, 184, 0, 0.15)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(180deg, rgba(26, 31, 46, 0.95) 0%, rgba(13, 17, 23, 0.95) 100%)',
      position: 'relative',
      height: '120px',
    },
    logo: {
      height: '100px',
      width: 'auto',
      filter: 'drop-shadow(0 0 16px rgba(255, 184, 0, 0.5))',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#fff',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '4px',
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      transition: 'background-color 0.2s',
    },
    content: {
      padding: '24px',
      paddingBottom: '24px',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
    },
    playersContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '32px 48px',
      position: 'relative',
      marginBottom: '24px',
    },
    playerSection: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      width: '140px',
    },
    playerAvatar: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      border: '3px solid rgba(255, 184, 0, 0.3)',
      boxShadow: '0 0 20px rgba(255, 184, 0, 0.2)',
      background: '#1a1f2e',
      position: 'relative',
    },
    playerAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      objectFit: 'cover',
    },
    sideImage: {
      position: 'absolute',
      width: '48px',
      height: '48px',
      top: -15,
      filter: 'drop-shadow(0 0 8px rgba(255, 184, 0, 0.4))',
    },
    sideImageLeft: {
      left: -15,
    },
    sideImageRight: {
      right: -15,
    },
    playerName: {
      color: '#8b949e',
      fontSize: '16px',
      fontWeight: '600',
      marginTop: '16px',
    },
    vsText: {
      color: '#FFB800',
      fontSize: '36px',
      fontWeight: 'bold',
      textShadow: '0 0 10px rgba(255, 184, 0, 0.5)',
    },
    gameInfo: {
      textAlign: 'center',
      padding: '0 48px 32px',
      borderBottom: '1px solid rgba(255, 184, 0, 0.1)',
    },
    gameId: {
      color: '#8b949e',
      fontSize: '14px',
      marginBottom: '12px',
      opacity: 0.8,
    },
    betValue: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      color: '#FFB800',
      fontSize: '28px',
      fontWeight: 'bold',
      textShadow: '0 0 10px rgba(255, 184, 0, 0.3)',
    },
    sectionsContainer: {
      display: 'flex',
      gap: '24px',
      padding: '32px 48px',
    },
    gameSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minWidth: 0,
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      backgroundColor: '#1a1f2e',
      borderRadius: '12px',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    },
    sectionTitle: {
      color: '#fff',
      fontSize: '16px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    sectionValue: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: '#FFB800',
      fontSize: '16px',
      fontWeight: '600',
    },
    percentageText: {
      color: '#8b949e',
      fontSize: '14px',
      marginLeft: '8px',
    },
    itemsContainer: {
      maxHeight: '300px',
      overflowY: 'auto',
      backgroundColor: '#12161f',
      borderRadius: '12px',
      border: '1px solid rgba(255, 184, 0, 0.1)',
      padding: '16px',
      marginBottom: '24px',
    },
    itemCard: {
      display: 'flex',
      alignItems: 'center',
      background: '#1a1f2e',
      borderRadius: '10px',
      padding: '12px 16px',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      gap: '16px',
      marginBottom: '8px',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    itemImage: {
      width: '48px',
      height: '48px',
      borderRadius: '8px',
      border: '2px solid rgba(255, 184, 0, 0.2)',
      objectFit: 'cover',
    },
    itemInfo: {
      flex: 1,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
    },
    itemName: {
      color: '#fff',
      fontSize: '14px',
      fontWeight: '500',
    },
    itemValue: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      color: '#FFB800',
      fontSize: '14px',
      fontWeight: '600',
    },
    cancelButton: {
      width: '100%',
      backgroundColor: '#dc3545',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 24px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      boxShadow: '0 4px 12px rgba(220, 53, 69, 0.2)',
    },
    // Animation styles
    coin: {
      width: '110px',
      height: '110px',
      position: 'absolute',
      left: 'calc(50% - 55px)',
      top: 'calc(50% - 55px)',
      zIndex: 20,
      border: '2px solid #FFB800',
      borderRadius: '50%',
      boxShadow: '0 0 20px rgba(255, 184, 0, 0.3)',
    },
    winnerBadge: {
      position: 'absolute',
      top: '-15px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#4CAF50',
      color: 'white',
      padding: '3px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      zIndex: 10,
    },
    winningInfo: {
      textAlign: 'center',
      marginTop: '10px',
      marginBottom: '20px',
      fontSize: '18px',
      color: '#CCC',
    },
    progressBar: {
      width: '100%',
      height: '24px',
      backgroundColor: '#1a1f2e',
      borderRadius: '12px',
      marginTop: '10px',
      position: 'relative',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#FFB800',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressText: {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '14px',
      textShadow: '0 0 3px rgba(0,0,0,0.5)',
    }
  };

  const isCreator = userInfo && gameData && String(userInfo.id) === String(gameData.creator);

  const handleCancelGame = async () => {
    // Validate all required data is present
    if (!gameData) {
      toast.error('No game data available', { duration: 3500 });
      return;
    }

    const gameId = gameData.id || gameData._id;
    if (!gameId) {
      toast.error('No game ID available', { duration: 3500 });
      return;
    }

    if (!userInfo) {
      toast.error('No user info available', { duration: 3500 });
      return;
    }

    if (isCanceling) {
      return;
    }

    // Validate user is the creator
    if (String(userInfo.id) !== String(gameData.creator)) {
      toast.error('Only the creator can cancel this game', { duration: 3500 });
      return;
    }
    
    try {
      setIsCanceling(true);
      const response = await fetch(`/api/coinflip/${gameId}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to cancel game', { duration: 3500 });
        setIsCanceling(false);
        return;
      }

      const data = await response.json();
      
      if (!data.success) {
        toast.error(data.message || 'Failed to cancel game', { duration: 3500 });
        setIsCanceling(false);
      } else {
        toast.success('Game canceled successfully', { duration: 3500 });
        // Close modal immediately on successful cancellation
        onClose();
        if (onGameCancelled) {
          onGameCancelled({ gameId });
        }
      }
    } catch (error) {
      console.error('Failed to cancel game:', error.message);
      toast.error('Failed to cancel game: ' + error.message, { duration: 3500 });
      setIsCanceling(false);
    }
  };

  // Make sure to render the correct side
  const renderCoinSide = () => {
    if (!gameData || !gameData.winningSide) return null;
    
    return (
      <img 
        src={gameData.winningSide === 'heads' ? HEADS_IMAGE_URL : TAILS_IMAGE_URL}
        alt={gameData.winningSide}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    );
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <img src="https://i.postimg.cc/YGB8Q0Zt/logo.png" alt="BloxRoll" style={styles.logo} />
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          <div style={{...styles.playersContainer, position: 'relative'}}>
            <div style={styles.playerSection}>
              <img 
                src={gameData.creatorSide === 'heads' ? HEADS_IMAGE_URL : TAILS_IMAGE_URL}
                alt={gameData.creatorSide}
                style={{
                  position: 'absolute',
                  width: '70px',
                  height: '70px',
                  top: -25,
                  left: -25,
                  filter: 'drop-shadow(0 0 8px rgba(255, 184, 0, 0.4))',
                }}
              />
              <div style={{
                ...styles.playerAvatar, 
                ...getCreatorStyle(),
                transition: 'all 0.5s ease-in-out',
                opacity: showResult ? 1 : 0.7,
              }}>
                <img 
                  src={displayCreatorAvatar} 
                  alt="Creator" 
                  style={styles.playerAvatarImage} 
                />
                {isGameCompleted && showResult && isCreatorWinner && (
                  <div style={{
                    ...styles.winnerBadge,
                    opacity: showResult ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                  }}>WINNER</div>
                )}
              </div>
              <span style={styles.playerName}>*******</span>
              <div style={styles.progressBar}>
                <div style={{...styles.progressFill, width: `${creatorPercentage}%`}}></div>
                <div style={styles.progressText}>{creatorPercentage}%</div>
              </div>
            </div>
            
            {isGameCompleted && (
              <div id="coin" className={`${gameData.winningSide === 'heads' ? 'heads' : 'tails'}`} style={{
                    position: 'relative',
                margin: '0 auto',
                width: '180px',
                height: '180px',
                cursor: 'pointer',
                transition: '-webkit-transform 1s ease-in',
                WebkitTransformStyle: 'preserve-3d',
                transformStyle: 'preserve-3d',
              }}>
                <div className="side-a" style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                  WebkitBorderRadius: '50%',
                  MozBorderRadius: '50%',
                  borderRadius: '50%',
                  WebkitBoxShadow: 'inset 0 0 45px rgba(255,255,255,.3), 0 12px 20px -10px rgba(0,0,0,.4)',
                  MozBoxShadow: 'inset 0 0 45px rgba(255,255,255,.3), 0 12px 20px -10px rgba(0,0,0,.4)',
                  boxShadow: 'inset 0 0 45px rgba(255,255,255,.3), 0 12px 20px -10px rgba(0,0,0,.4)',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  backgroundImage: `url(${HEADS_IMAGE_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 100,
                }}></div>
                <div className="side-b" style={{
                  position: 'absolute',
                    width: '100%',
                    height: '100%',
                  WebkitBorderRadius: '50%',
                  MozBorderRadius: '50%',
                  borderRadius: '50%',
                  WebkitBoxShadow: 'inset 0 0 45px rgba(255,255,255,.3), 0 12px 20px -10px rgba(0,0,0,.4)',
                  MozBoxShadow: 'inset 0 0 45px rgba(255,255,255,.3), 0 12px 20px -10px rgba(0,0,0,.4)',
                  boxShadow: 'inset 0 0 45px rgba(255,255,255,.3), 0 12px 20px -10px rgba(0,0,0,.4)',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  WebkitTransform: 'rotateY(-180deg)',
                  MozTransform: 'rotateY(-180deg)',
                  transform: 'rotateY(-180deg)',
                  backgroundImage: `url(${TAILS_IMAGE_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}></div>
              </div>
            )}
            
            {isGameCompleted ? (
              <div style={styles.playerSection}>
                <img 
                  src={gameData.creatorSide === 'heads' ? TAILS_IMAGE_URL : HEADS_IMAGE_URL}
                  alt={gameData.creatorSide === 'heads' ? 'tails' : 'heads'}
                  style={{
                    position: 'absolute',
                    width: '70px',
                    height: '70px',
                    top: -25,
                    right: -25,
                    filter: 'drop-shadow(0 0 8px rgba(255, 184, 0, 0.4))',
                  }}
                />
                <div style={{
                  ...styles.playerAvatar,
                  ...getJoinerStyle(),
                  transition: 'all 0.5s ease-in-out',
                  opacity: showResult ? 1 : 0.7,
                }}>
                  <img 
                    src={displayJoinerAvatar} 
                    alt="Joiner" 
                    style={styles.playerAvatarImage} 
                  />
                  {isGameCompleted && showResult && !isCreatorWinner && (
                    <div style={{
                      ...styles.winnerBadge,
                      opacity: showResult ? 1 : 0,
                      transition: 'opacity 0.5s ease-in-out',
                    }}>WINNER</div>
                  )}
                </div>
                <span style={styles.playerName}>*******</span>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: `${joinerPercentage}%`}}></div>
                  <div style={styles.progressText}>{joinerPercentage}%</div>
                </div>
              </div>
            ) : (
              <>
            <span style={styles.vsText}>VS</span>
            <div style={styles.playerSection}>
              <img 
                    src={gameData.creatorSide === 'heads' ? TAILS_IMAGE_URL : HEADS_IMAGE_URL}
                    alt={gameData.creatorSide === 'heads' ? 'tails' : 'heads'}
                    style={{
                      position: 'absolute',
                      width: '70px',
                      height: '70px',
                      top: -25,
                      right: -25,
                      filter: 'drop-shadow(0 0 8px rgba(255, 184, 0, 0.4))',
                    }}
              />
              <div style={{...styles.playerAvatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: '#8b949e'}}>
                ?
              </div>
              <span style={styles.playerName}>Joining...</span>
                  <div style={styles.progressBar}>
                    <div style={{...styles.progressFill, width: `${joinerPercentage}%`}}></div>
                    <div style={styles.progressText}>{joinerPercentage}%</div>
                  </div>
            </div>
              </>
            )}
          </div>

          <div style={styles.gameInfo}>
            <div style={styles.gameId}>#{gameData.id || gameData._id}</div>
            <div style={styles.betValue}>
              <span>💎</span>
              <span>{formatValue(totalPotValue)}</span>
            </div>
          </div>

          {isCreator && !isGameCompleted && !gameData.joiner && (
            <button 
              style={{
                ...styles.cancelButton,
                opacity: isCanceling ? 0.7 : 1,
                cursor: isCanceling ? 'not-allowed' : 'pointer',
                marginTop: '16px',
                marginBottom: '16px'
              }}
              onClick={handleCancelGame}
              disabled={isCanceling}
            >
              {isCanceling ? 'Canceling...' : 'Cancel Game'}
            </button>
          )}

          <div style={styles.sectionsContainer}>
            <div style={styles.gameSection}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Creator's Items</span>
                <span style={styles.sectionValue}>
                  <span>💎</span>
                  <span>{formatValue(gameData.value)}</span>
                  <span style={styles.percentageText}>({creatorPercentage}%)</span>
                </span>
              </div>
              <div style={styles.itemsContainer}>
                {gameData.creatorItems && gameData.creatorItems.map((item, index) => (
                  <div key={index} style={styles.itemCard}>
                    <img src={item.image} alt={item.name} style={styles.itemImage} />
                    <div style={styles.itemInfo}>
                      <div style={styles.itemName}>{item.name}</div>
                      <div style={styles.itemValue}>
                        <span>💎</span>
                        <span>{formatValue(item.value)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.gameSection}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Joiner's Items</span>
                <span style={styles.sectionValue}>
                  <span>💎</span>
                  <span>{formatValue(gameData.joinerItems?.reduce((sum, item) => sum + Number(item.value), 0) || 0)}</span>
                  <span style={styles.percentageText}>({joinerPercentage}%)</span>
                </span>
              </div>
              <div style={styles.itemsContainer}>
                {gameData.joinerItems && gameData.joinerItems.map((item, index) => (
                  <div key={index} style={styles.itemCard}>
                    <img src={item.image} alt={item.name} style={styles.itemImage} />
                    <div style={styles.itemInfo}>
                      <div style={styles.itemName}>{item.name}</div>
                      <div style={styles.itemValue}>
                        <span>💎</span>
                        <span>{formatValue(item.value)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        #coin {
          transition: -webkit-transform 1s ease-in;
          -webkit-transform-style: preserve-3d;
        }

        #coin div {
          position: absolute;
          -webkit-backface-visibility: hidden;
        }

        .side-a {
          z-index: 100;
        }

        .side-b {
          -webkit-transform: rotateY(-180deg);
          -moz-transform: rotateY(-180deg);
          transform: rotateY(-180deg);
        }

        #coin.heads {
          -webkit-animation: flipHeads 3s ease-out forwards;
          -moz-animation: flipHeads 3s ease-out forwards;
          -o-animation: flipHeads 3s ease-out forwards;
          animation: flipHeads 3s ease-out forwards;
        }

        #coin.tails {
          -webkit-animation: flipTails 3s ease-out forwards;
          -moz-animation: flipTails 3s ease-out forwards;
          -o-animation: flipTails 3s ease-out forwards;
          animation: flipTails 3s ease-out forwards;
        }

        @-webkit-keyframes flipHeads {
          from { 
            -webkit-transform: rotateY(0);
            -moz-transform: rotateY(0);
            transform: rotateY(0);
          }
          to { 
            -webkit-transform: rotateY(1800deg);
            -moz-transform: rotateY(0);
            transform: rotateY(1800deg);
          }
        }

        @-webkit-keyframes flipTails {
          from { 
            -webkit-transform: rotateY(0);
            -moz-transform: rotateY(0);
            transform: rotateY(0);
          }
          to { 
            -webkit-transform: rotateY(1980deg);
            -moz-transform: rotateY(1980deg);
            transform: rotateY(1980deg);
          }
        }

        @keyframes flipHeads {
          from { 
            -webkit-transform: rotateY(0);
            -moz-transform: rotateY(0);
            transform: rotateY(0);
          }
          to { 
            -webkit-transform: rotateY(1800deg);
            -moz-transform: rotateY(1800deg);
            transform: rotateY(1800deg);
          }
        }

        @keyframes flipTails {
          from { 
            -webkit-transform: rotateY(0);
            -moz-transform: rotateY(0);
            transform: rotateY(0);
          }
          to { 
            -webkit-transform: rotateY(1980deg);
            -moz-transform: rotateY(1980deg);
            transform: rotateY(1980deg);
          }
        }
      `}</style>
    </div>
  );
};

export default CoinflipViewModal; 