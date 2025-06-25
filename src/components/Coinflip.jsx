import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CoinflipGame from './CoinflipGame';
import CreateGameModal from './CreateGameModal';
import JoinGameModal from './JoinGameModal';

const Coinflip = ({ userInfo, isMobile, isPad }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsPad(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await axios.get('/api/coinflip/games');
        setGames(response.data.games);
      } catch (error) {
        console.error('Error fetching games:', error);
        setError('Failed to load games');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
    // Poll for new games every 5 seconds
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, []);

  const styles = {
    container: {
      padding: isMobile ? '10px' : '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isMobile ? '10px' : '20px',
      padding: isMobile ? '0 10px' : '0'
    },
    title: {
      color: '#fff',
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    createButton: {
      background: 'linear-gradient(135deg, #00C851, #00E701)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: isMobile ? '8px 16px' : '10px 20px',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    gamesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '12px' : '8px'
    },
    loading: {
      color: '#fff',
      textAlign: 'center',
      padding: '20px'
    },
    error: {
      color: '#ff4444',
      textAlign: 'center',
      padding: '20px'
    },
    noGames: {
      color: '#fff',
      textAlign: 'center',
      padding: '20px',
      opacity: 0.7
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
      gap: '12px',
      padding: isMobile ? '10px' : '20px',
      background: '#1A1F2E',
      borderRadius: '12px',
      marginBottom: '16px'
    },
    statBox: {
      display: 'flex',
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'center',
      gap: isMobile ? '8px' : '4px',
      padding: '12px',
      background: '#0d1117',
      borderRadius: '8px',
      border: '1px solid rgba(255, 184, 0, 0.1)'
    },
    statValue: {
      color: '#FFB800',
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: 'bold',
      fontFamily: "'Chakra Petch', sans-serif",
      order: isMobile ? 2 : 0
    },
    statLabel: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: isMobile ? '12px' : '12px',
      textTransform: 'uppercase',
      order: isMobile ? 1 : 0
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading games...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  // Mobile/Tablet Layout
  if (isMobile || isPad) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090B15',
        padding: isPad ? '20px' : '10px',
        paddingBottom: '80px' // Space for bottom navigation
      }}>
        {/* Games List */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isPad ? 'repeat(2, 1fr)' : '1fr',
          gap: isPad ? '20px' : '15px',
          marginBottom: '20px'
        }}>
          {games.map((game) => (
            <CoinflipGame
              key={game.id}
              game={game}
              userInfo={userInfo}
              onJoinGame={handleJoinGame}
              isMobile={isMobile}
              isPad={isPad}
            />
          ))}
        </div>

        {/* Create Game Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            position: 'fixed',
            bottom: window.innerWidth <= 768 ? '70px' : '80px',
            right: window.innerWidth <= 768 ? '10px' : '20px',
            background: 'linear-gradient(135deg, #FFB800 0%, #FFDB1C 100%)',
            color: '#000',
            border: 'none',
            borderRadius: '50%',
            width: isPad ? '70px' : '60px',
            height: isPad ? '70px' : '60px',
            fontSize: isPad ? '32px' : '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(255, 184, 0, 0.3)',
            cursor: 'pointer',
            zIndex: 98
          }}
        >
          +
        </button>

        {/* Modals */}
        <CreateGameModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          userInfo={userInfo}
          isMobile={isMobile}
          isPad={isPad}
        />
        <JoinGameModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          selectedGame={selectedGame}
          userInfo={userInfo}
          isMobile={isMobile}
          isPad={isPad}
        />
      </div>
    );
  }

  // Desktop Layout remains unchanged
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span>🎲</span>
          Coinflip Games
        </h1>
        <button style={styles.createButton}>
          <span>+</span>
          Create Game
        </button>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statBox}>
          <div style={styles.statValue}>1</div>
          <div style={styles.statLabel}>Total Games</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue}>570.00M</div>
          <div style={styles.statLabel}>Total Value</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue}>0</div>
          <div style={styles.statLabel}>Biggest Win</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue}>0</div>
          <div style={styles.statLabel}>Tax Pool</div>
        </div>
      </div>

      <div style={styles.gamesList}>
        {games.length === 0 ? (
          <div style={styles.noGames}>No active games found</div>
        ) : (
          games.map(game => (
            <CoinflipGame key={game._id} game={game} isMobile={isMobile} />
          ))
        )}
      </div>
    </div>
  );
};

export default Coinflip; 