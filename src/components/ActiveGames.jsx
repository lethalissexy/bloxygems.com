import React, { useEffect, useState } from 'react';
import CoinflipCard from './CoinflipCard';
import './ActiveGames.css';
import io from 'socket.io-client';

const ActiveGames = ({ onJoinGame, onViewGame, isMobile }) => {
  const [activeGames, setActiveGames] = useState([]);
  const [endedGames, setEndedGames] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = high to low, 'asc' = low to high

  useEffect(() => {
    const fetchActiveGames = async () => {
      try {
        const response = await fetch('/api/coinflip/games');
        const data = await response.json();
        
        if (data.success) {
          setActiveGames(data.games);
        }
      } catch (error) {
        console.error('Failed to fetch active games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveGames();

    // Set up socket connection with relative path
    const SOCKET_URL = '/';
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('ActiveGames socket connected to', SOCKET_URL);
    });

    socket.on('connect_error', (error) => {
      console.error('ActiveGames socket connection error:', error);
    });

    // Listen for new games being created
    socket.on('game_created', (newGame) => {
      setActiveGames(prevGames => [newGame, ...prevGames]);
    });

    // Listen for games being joined
    socket.on('game_joined', (gameData) => {
      // Remove from active games
      setActiveGames(prevGames => 
        prevGames.filter(game => game._id !== gameData.gameId)
      );

      // Add to ended games with all necessary data
      setEndedGames(prev => {
        const newMap = new Map(prev);
        // Determine winning side based on creator's side and winner
        const isCreatorWinner = gameData.winner === gameData.creator;
        const winningSide = isCreatorWinner ? gameData.creatorSide : (gameData.creatorSide === 'heads' ? 'tails' : 'heads');
        
        newMap.set(gameData.gameId, {
          _id: gameData.gameId,
          creatorAvatar: gameData.creatorAvatar,
          creatorName: gameData.creatorName,
          joinerAvatar: gameData.joinerAvatar,
          joinerName: gameData.joinerName,
          creatorItems: gameData.creatorItems,
          joinerItems: gameData.joinerItems,
          value: gameData.value,
          totalValue: gameData.totalValue,
          creatorSide: gameData.creatorSide,
          joinerSide: gameData.joinerSide,
          winner: gameData.winner,
          winningSide: winningSide,
          hasJoined: true,
          state: gameData.state,
          creator: gameData.creator,
          joiner: gameData.joiner,
          endedAt: gameData.endedAt,
          joinRangeMin: gameData.joinRangeMin,
          joinRangeMax: gameData.joinRangeMax,
          normalizedResult: gameData.normalizedResult
        });
        return newMap;
      });

      // Set up timeout to remove the ended game after 30 seconds
      setTimeout(() => {
        setEndedGames(prev => {
          const newMap = new Map(prev);
          newMap.delete(gameData.gameId);
          return newMap;
        });
      }, 30000);
    });

    // Listen for games being deleted/canceled
    socket.on('game_deleted', (gameId) => {
      setActiveGames(prevGames => 
        prevGames.filter(game => game._id !== gameId)
      );
      setEndedGames(prev => {
        const newMap = new Map(prev);
        newMap.delete(gameId);
        return newMap;
      });
    });

    // Listen for bulk updates (e.g., when multiple games change at once)
    socket.on('active_games_update', (games) => {
      setActiveGames(games);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Sort games by value
  const sortedGames = [...activeGames].sort((a, b) =>
    sortOrder === 'desc' ? b.value - a.value : a.value - b.value
  );

  if (loading) {
    return (
      <div className="active-games-loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="active-games-container" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div className="coinflip-sort-filter" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end', 
        padding: '0 16px 12px 16px',
        borderBottom: '1px solid rgba(255, 184, 0, 0.1)'
      }}>
        <label htmlFor="sortOrder" style={{ color: '#FFB800', marginRight: 8, fontWeight: 600 }}>Sort by:</label>
        <select
          id="sortOrder"
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
          style={{
            background: '#151d2e',
            color: '#FFB800',
            border: '1px solid #FFB800',
            borderRadius: 4,
            padding: '4px 12px',
            fontWeight: 'bold',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
          }}
        >
          <option value="desc">Value: High to Low</option>
          <option value="asc">Value: Low to High</option>
        </select>
      </div>

      <div className="active-games-grid" style={{
        flex: 1,
        overflow: 'auto',
        display: 'grid',
        gap: '12px',
        padding: '12px',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(600px, 1fr))',
        alignContent: 'start',
        height: '100%'
      }}>
        {/* Show ended games first */}
        {Array.from(endedGames.values()).map((game) => (
          <CoinflipCard
            key={game._id}
            gameId={game._id}
            creatorAvatar={game.creatorAvatar}
            creatorName={game.creatorName}
            items={game.creatorItems}
            value={game.value}
            totalValue={game.totalValue}
            creatorSide={game.creatorSide}
            hasJoined={true}
            joinerAvatar={game.joinerAvatar}
            joinerName={game.joinerName}
            winner={game.winner}
            winningSide={game.winningSide}
            creator={game.creator}
            joinerItems={game.joinerItems}
            isMobile={isMobile}
            onView={() => onViewGame({
              ...game,
              id: game._id,
              state: 'ended',
              hasJoined: true
            })}
          />
        ))}

        {/* Show active games */}
        {sortedGames.length === 0 && endedGames.size === 0 ? (
          <div className="no-games-message" style={{
            textAlign: 'center',
            color: '#8b949e',
            fontSize: '16px',
            padding: '32px',
            gridColumn: '1 / -1'
          }}>
            No active games found. Create one to start playing!
          </div>
        ) : (
          sortedGames.map((game) => (
            <CoinflipCard
              key={game._id}
              gameId={game._id}
              creatorAvatar={game.creatorAvatar}
              creatorName={game.creatorName}
              items={game.creatorItems}
              value={game.value}
              joinRangeMin={game.joinRangeMin}
              joinRangeMax={game.joinRangeMax}
              creatorSide={game.creatorSide}
              creator={game.creator}
              isMobile={isMobile}
              onJoin={() => onJoinGame(game)}
              onView={() => onViewGame(game)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ActiveGames; 