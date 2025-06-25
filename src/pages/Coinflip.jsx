import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { formatValue } from '../utils/formatters';
import CreateGame from '../components/CreateGame';
import HistoryModal from '../components/HistoryModal';
import Toast from '../components/Toast';
import ActiveGames from '../components/ActiveGames';
import CoinflipViewModal from '../components/CoinflipViewModal';
import JoinCoinflipModal from '../components/JoinCoinflipModal';

function Coinflip() {
  const [stats, setStats] = useState({
    totalGames: 0,
    totalValue: 0,
    biggestWin: 0,
    taxCollected: 0,
    hourlyResetTime: 0,
    dailyResetTime: 0,
    _rawData: {
      biggestWin: 0,
      taxPool: 0
    }
  });
  
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [dailyCountdown, setDailyCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedGameToJoin, setSelectedGameToJoin] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch raw stats directly from database
  useEffect(() => {
    const fetchRawStats = async () => {
      try {
        setStatsLoading(true);
        console.log("Fetching raw stats from database...");
        const response = await fetch('/api/coinflip/raw-stats');
        const data = await response.json();
        
        if (data.success && data.rawStats) {
          console.log("Raw stats received:", data.rawStats);
          
          // Calculate reset times
          const now = Math.floor(Date.now() / 1000);
          const currentHourStart = Math.floor(now / 3600) * 3600;
          const nextHourStart = currentHourStart + 3600;
          const currentDayStart = Math.floor(now / 86400) * 86400;
          const nextDayStart = currentDayStart + 86400;
          
          // Build complete stats object
          const completeStats = {
            totalGames: 0, // These will be updated by socket events
            totalValue: 0,
            biggestWin: data.rawStats.biggestWin,
            taxCollected: data.rawStats.taxPool,
            hourlyResetTime: nextHourStart,
            dailyResetTime: nextDayStart,
            _rawData: {
              biggestWin: data.rawStats.biggestWin,
              taxPool: data.rawStats.taxPool
            },
            _lastUpdated: Date.now()
          };
          
          console.log("Setting stats:", completeStats);
          setStats(completeStats);
          
          // Set initial countdowns
          setCountdown({
            hours: Math.floor(Math.max(0, nextHourStart - now) / 3600),
            minutes: Math.floor((Math.max(0, nextHourStart - now) % 3600) / 60),
            seconds: Math.max(0, nextHourStart - now) % 60
          });
          
          setDailyCountdown({
            hours: Math.floor(Math.max(0, nextDayStart - now) / 3600),
            minutes: Math.floor((Math.max(0, nextDayStart - now) % 3600) / 60),
            seconds: Math.max(0, nextDayStart - now) % 60
          });
        } else {
          console.error("Failed to fetch raw stats:", data);
        }
      } catch (error) {
        console.error("Error fetching raw stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchRawStats();
  }, []);

  useEffect(() => {
    // Get user info
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/session/check', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.userInfo) {
            setUserInfo({
              ...data.userInfo,
              id: data.userInfo.id
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUserInfo();

    // Connect to Socket.IO - use relative path which will be proxied
    const SOCKET_URL = '/';
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('Coinflip socket connected to', SOCKET_URL);
    });

    socket.on('connect_error', (error) => {
      console.error('Coinflip socket connection error:', error);
    });

    // Listen for stats updates with reset times
    socket.on('coinflip_stats', (newStats) => {
      // Immediately log old and new values to see what's changing
      const oldStats = { ...stats };
      console.log('Stats update received:', {
        totalGames: {old: oldStats.totalGames, new: newStats.totalGames},
        totalValue: {old: oldStats.totalValue, new: newStats.totalValue},
        biggestWin: {old: oldStats.biggestWin, new: newStats.biggestWin},
        taxCollected: {old: oldStats.taxCollected, new: newStats.taxCollected},
        rawData: newStats._rawData
      });
      
      // Force state update with a complete new object to ensure React detects the change
      setStats({
        ...newStats,
        _lastUpdated: Date.now() // Add timestamp to force re-render even if values are same
      });
      
      // Calculate initial countdowns
      const now = Math.floor(Date.now() / 1000);
      setCountdown({
        hours: Math.floor(Math.max(0, newStats.hourlyResetTime - now) / 3600),
        minutes: Math.floor((Math.max(0, newStats.hourlyResetTime - now) % 3600) / 60),
        seconds: Math.max(0, newStats.hourlyResetTime - now) % 60
      });
      setDailyCountdown({
        hours: Math.floor(Math.max(0, newStats.dailyResetTime - now) / 3600),
        minutes: Math.floor((Math.max(0, newStats.dailyResetTime - now) % 3600) / 60),
        seconds: Math.max(0, newStats.dailyResetTime - now) % 60
      });
      
      // Flash the stats that changed to highlight updates
      const statsContainer = document.querySelector('[data-stats-container]');
      if (statsContainer) {
        statsContainer.classList.add('flash-update');
        setTimeout(() => {
          statsContainer.classList.remove('flash-update');
        }, 1000);
      }
    });

    // Listen for game completion to update stats
    socket.on('game_ended', (gameData) => {
      console.log('Game ended event received:', gameData);
      // Stats will be updated by server-side event
    });

    // Listen for game joined to update stats
    socket.on('game_joined', (gameData) => {
      console.log('Game joined event received:', gameData);
      // Stats will be updated by server-side event
    });

    // Listen for game creation to update stats
    socket.on('game_created', (gameData) => {
      console.log('Game created event received:', gameData);
      // Stats will be updated by server-side event
    });

    // Listen for new announcements
    socket.on('new_announcement', (announcement) => {
      setToastMessage(announcement.content);
      setShowToast(true);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    });
    
    // Countdown timer
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      
      // Update hourly countdown
      setCountdown({
        hours: Math.floor(Math.max(0, stats.hourlyResetTime - now) / 3600),
        minutes: Math.floor((Math.max(0, stats.hourlyResetTime - now) % 3600) / 60),
        seconds: Math.max(0, stats.hourlyResetTime - now) % 60
      });
      
      // Update daily countdown
      setDailyCountdown({
        hours: Math.floor(Math.max(0, stats.dailyResetTime - now) / 3600),
        minutes: Math.floor((Math.max(0, stats.dailyResetTime - now) % 3600) / 60),
        seconds: Math.max(0, stats.dailyResetTime - now) % 60
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      clearInterval(timer);
    };
  }, [stats.hourlyResetTime, stats.dailyResetTime]);

  const formatCountdown = (time) => {
    return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`;
  };

  const handleOpenCreateModal = () => {
    if (!userInfo) {
      setToastMessage('Please log in to create a game');
      setShowToast(true);
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleOpenHistoryModal = () => {
    if (!userInfo) {
      setToastMessage('Please log in to view your history');
      setShowToast(true);
      return;
    }
    setIsHistoryModalOpen(true);
  };

  const handleGameCreated = (game) => {
    setSelectedGame(game);
    setIsViewModalOpen(true);
  };

  const handleJoinGame = (game) => {
    if (!userInfo) {
      setToastMessage('Please log in to join a game');
      setToastType('error');
      setShowToast(true);
      return;
    }
    setSelectedGameToJoin(game);
    setIsJoinModalOpen(true);
  };

  useEffect(() => {
    // Listen for toast events
    const handleToast = (event) => {
      setToastMessage(event.detail.message);
      setToastType(event.detail.type || 'info'); // Default to 'info' if type is not provided
      setShowToast(true);
    };

    window.addEventListener('show-toast', handleToast);

    return () => {
      window.removeEventListener('show-toast', handleToast);
    };
  }, []);

  const styles = {
    container: {
      padding: '12px',
      marginLeft: isMobile ? '0' : '300px',
      width: isMobile ? '100%' : 'calc(100% - 300px)',
      height: '100vh',
      color: '#fff',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      gap: '12px',
      minWidth: isMobile ? 'auto' : '1200px',
      maxWidth: '1800px',
      margin: '0 auto'
    },
    contentWrapper: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      minHeight: 0,
      overflow: 'hidden',
      paddingBottom: isMobile ? '70px' : 0
    },
    announcement: {
      width: '100%',
      background: 'linear-gradient(90deg, rgba(18, 22, 41, 0.95) 0%, rgba(13, 16, 31, 0.95) 100%)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      borderRadius: '6px',
      padding: isMobile ? '10px' : '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#FFB800',
      fontSize: isMobile ? '12px' : '13px',
      fontWeight: '500',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    },
    announcementIcon: {
      fontSize: '1.4rem',
      animation: 'bounce 2s infinite',
      filter: 'drop-shadow(0 0 8px rgba(255, 184, 0, 0.4))'
    },
    announcementContent: {
      flex: 1,
      lineHeight: '1.4',
      letterSpacing: '0.02em'
    },
    '@keyframes bounce': {
      '0%, 100%': {
        transform: 'translateY(0)'
      },
      '50%': {
        transform: 'translateY(-3px)'
      }
    },
    '@keyframes glow': {
      '0%, 100%': {
        borderColor: 'rgba(255, 184, 0, 0.15)'
      },
      '50%': {
        borderColor: 'rgba(255, 184, 0, 0.3)',
        boxShadow: '0 4px 20px rgba(255, 184, 0, 0.1)'
      }
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? '10px 0' : isTablet ? '12px 0' : '0 0 6px 0',
      borderBottom: '1px solid rgba(255, 184, 0, 0.1)',
      gap: '12px',
      flexDirection: isMobile ? 'column' : 'row',
      flexWrap: isTablet ? 'wrap' : 'nowrap'
    },
    titleSection: {
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(8px, 1vw, 16px)',
      width: isMobile ? '100%' : 'auto',
      justifyContent: isMobile ? 'center' : 'flex-start'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#FFB800',
      margin: 0,
      whiteSpace: 'nowrap'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
      width: isMobile ? '100%' : 'auto',
      justifyContent: isMobile ? 'center' : 'flex-end',
      flexWrap: 'wrap'
    },
    button: {
      padding: isMobile ? '8px 16px' : '6px 12px',
      borderRadius: '6px',
      fontSize: isMobile ? '14px' : '13px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: "'Chakra Petch', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
      height: isMobile ? '36px' : '28px',
      flex: isMobile ? '1' : 'initial'
    },
    createButton: {
      backgroundColor: '#FFB800',
      color: '#000',
      border: 'none',
      boxShadow: '0 4px 15px rgba(255, 184, 0, 0.15)'
    },
    historyButton: {
      backgroundColor: 'rgba(255, 184, 0, 0.1)',
      color: '#FFB800',
      border: '1px solid rgba(255, 184, 0, 0.3)'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
      gap: '16px',
      padding: '0 16px',
      marginBottom: '16px'
    },
    statBox: {
      background: 'rgba(26, 31, 46, 0.5)',
      borderRadius: '12px',
      padding: isMobile ? '12px' : '16px',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      display: isMobile ? 'flex' : 'block',
      alignItems: isMobile ? 'center' : 'initial',
      justifyContent: isMobile ? 'space-between' : 'initial'
    },
    statLabel: {
      color: '#8b949e',
      fontSize: isMobile ? '13px' : '14px',
      marginBottom: isMobile ? '0' : '8px',
      position: 'relative',
      order: isMobile ? 1 : 0
    },
    statValue: {
      color: '#FFB800',
      fontSize: isMobile ? '18px' : '24px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      order: isMobile ? 2 : 0
    },
    resetTimer: {
      color: '#FFB800',
      fontSize: '12px',
      opacity: 0.8,
      marginTop: isMobile ? '2px' : '4px',
      fontFamily: 'monospace'
    },
    gamesContainer: {
      flex: 1,
      minHeight: 0,
      background: 'linear-gradient(180deg, rgba(18, 22, 41, 0.95) 0%, rgba(13, 16, 31, 0.85) 100%)',
      border: '1px solid rgba(255, 184, 0, 0.15)',
      borderRadius: '6px',
      padding: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 4px 25px rgba(0, 0, 0, 0.25)'
    },
    gamesList: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden'
    },
    loadingText: {
      textAlign: 'center',
      fontSize: '1.2rem',
      color: '#B8C3E6',
      padding: '3rem',
      opacity: 0.8
    },
    refreshButton: {
      backgroundColor: 'rgba(255, 184, 0, 0.1)',
      color: '#FFB800',
      border: '1px solid rgba(255, 184, 0, 0.3)'
    },
    lastUpdated: {
      color: '#8b949e',
      fontSize: '12px',
      textAlign: 'right',
      padding: isMobile ? '4px 8px' : '4px 16px 8px',
      gridColumn: '1 / -1',
      opacity: 0.6,
      fontStyle: 'italic'
    }
  };

  // Add keyframes to document
  const addKeyframes = () => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      @keyframes glow {
        0%, 100% { border-color: rgba(255, 184, 0, 0.15); }
        50% { border-color: rgba(255, 184, 0, 0.3); box-shadow: 0 4px 20px rgba(255, 184, 0, 0.1); }
      }
    `;
    document.head.appendChild(styleSheet);
  };

  // Add useEffect to component
  useEffect(() => {
    addKeyframes();
  }, []);

  // Update the useEffect for chat width observer
  useEffect(() => {
    // Add chat width observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('chat-open')) {
          document.documentElement.style.setProperty('--chat-width', '370px');
        } else {
          document.documentElement.style.setProperty('--chat-width', '0px');
        }
      });
    });

    // Start observing the body for chat class changes
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Add a function to refresh stats manually
  const refreshStats = async () => {
    try {
      setStatsLoading(true);
      console.log("Manually refreshing stats...");
      const response = await fetch('/api/coinflip/raw-stats');
      const data = await response.json();
      
      if (data.success && data.rawStats) {
        console.log("Refreshed raw stats received:", data.rawStats);
        
        // Update only the _rawData part to preserve other values like totalGames
        setStats(prevStats => ({
          ...prevStats,
          biggestWin: data.rawStats.biggestWin,
          taxCollected: data.rawStats.taxPool,
          _rawData: {
            biggestWin: data.rawStats.biggestWin,
            taxPool: data.rawStats.taxPool
          },
          _lastUpdated: Date.now()
        }));
        
        // Flash the updated stats
        const statsContainer = document.querySelector('[data-stats-container]');
        if (statsContainer) {
          statsContainer.classList.add('flash-update');
          setTimeout(() => {
            statsContainer.classList.remove('flash-update');
          }, 1000);
        }
      } else {
        console.error("Failed to refresh stats:", data);
      }
    } catch (error) {
      console.error("Error refreshing stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <>
      <div style={styles.container}>
        <div style={styles.contentWrapper}>
          <div style={styles.announcement}>
            <span style={styles.announcementIcon}>🎉</span>
            <span style={styles.announcementContent}>
              We automatically give away 15% of all collected tax to the community through automated giveaways!
              </span>
          </div>
        
          <div style={styles.header}>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>Coinflip Games</h1>
            </div>
            <div style={styles.buttonGroup}>
              <button 
                style={{...styles.button, ...styles.refreshButton}}
                onClick={refreshStats}
                disabled={statsLoading}
              >
                {statsLoading ? 'Loading...' : '↻ Refresh Stats'}
              </button>
              <button 
                style={{...styles.button, ...styles.historyButton}}
                onClick={handleOpenHistoryModal}
              >
                History
              </button>
              <button 
                style={{...styles.button, ...styles.createButton}}
                onClick={handleOpenCreateModal}
              >
                + Create Game
              </button>
            </div>
          </div>

          <div style={styles.statsContainer} data-stats-container>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Total Games</div>
              <div style={styles.statValue}>🎮 {stats.totalGames}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Total Value</div>
              <div style={styles.statValue}>💎 {formatValue(stats.totalValue)}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>
                Biggest Win
                <div style={styles.resetTimer}>Resets in: {formatCountdown(dailyCountdown)}</div>
              </div>
              <div style={styles.statValue}>
                {statsLoading ? (
                  <span>Loading...</span>
                ) : (
                  <>💎 {formatValue(stats._rawData?.biggestWin)}</>
                )}
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>
                Tax Pool
                <div style={styles.resetTimer}>Resets in: {formatCountdown(countdown)}</div>
              </div>
              <div style={styles.statValue}>
                {statsLoading ? (
                  <span>Loading...</span>
                ) : (
                  <>💎 {formatValue(stats._rawData?.taxPool)}</>
                )}
              </div>
            </div>
            
            {stats._lastUpdated && (
              <div style={styles.lastUpdated}>
                Stats last updated: {new Date(stats._lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
      
          <div style={styles.gamesContainer}>
            <div style={styles.gamesList}>
              <ActiveGames 
                onJoinGame={handleJoinGame} 
                onViewGame={(game) => {
                  setSelectedGame(game);
                  setIsViewModalOpen(true);
                }} 
                isMobile={isMobile}
                isTablet={isTablet}
              />
            </div>
          </div>
          
          {/* Hidden debug element to verify raw values */}
          <div style={{ display: process.env.NODE_ENV === 'development' ? 'block' : 'none', fontSize: '10px', opacity: 0.5, color: '#fff', padding: '5px', marginTop: '10px', backgroundColor: '#000', borderRadius: '4px' }}>
            DEBUG - Raw values from MongoDB: 
            <br />biggestWin: {stats._rawData?.biggestWin || 'undefined'} 
            <br />taxPool: {stats._rawData?.taxPool || 'undefined'}
          </div>
      </div>

        {/* Modals */}
        <CreateGame 
        isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)} 
          userInfo={userInfo}
          onGameCreated={handleGameCreated}
        />
        
        <HistoryModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)} 
        />

        <CoinflipViewModal
          isOpen={isViewModalOpen}
        onClose={() => {
            setIsViewModalOpen(false);
            setSelectedGame(null);
          }}
          game={selectedGame}
          onGameCancelled={() => {
            setIsViewModalOpen(false);
            setSelectedGame(null);
        }}
      />
      
      <JoinCoinflipModal
        isOpen={isJoinModalOpen}
          onClose={() => {
            setIsJoinModalOpen(false);
            setSelectedGameToJoin(null);
          }}
          game={selectedGameToJoin}
          onGameJoined={(joinedGame) => {
            // When a game is successfully joined, just close the join modal
            setIsJoinModalOpen(false);
            setSelectedGameToJoin(null);
            
            // No need to open the view modal - user will see the game in the list
          }}
        />

        {showToast && (
          <Toast 
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
            duration={3000}
          />
        )}
    </div>
    </>
  );
}

export default Coinflip; 

