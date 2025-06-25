import React, { useState, useEffect } from 'react';
import './CoinflipCard.css';
import CoinflipViewModal from './CoinflipViewModal';
import { HEADS_IMAGE_URL, TAILS_IMAGE_URL } from '../utils/coinflipAssets';

const formatValue = (value) => {
  if (value >= 1000000000) {
    return `💎 ${(value / 1000000000).toFixed(2)}b`;
  } else if (value >= 1000000) {
    return `💎 ${(value / 1000000).toFixed(2)}m`;
  } else if (value >= 1000) {
    return `💎 ${(value / 1000).toFixed(2)}k`;
  }
  return `💎 ${value}`;
};

const CoinflipCard = ({ 
  creatorAvatar,
  creatorName,
  items, 
  value, 
  totalValue,
  joinRangeMin, 
  joinRangeMax, 
  creatorSide,
  gameId,
  creator,
  onJoin,
  hasJoined = false,
  joinerAvatar = null,
  joinerName = null,
  winner = null,
  winningSide = null,
  joinerItems = null,
  isMobile = false
}) => {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const maxDisplayItems = isMobile ? 2 : 4;
  const displayedItems = items.slice(0, maxDisplayItems);
  const remainingItems = items.length - maxDisplayItems;

  const handleView = () => {
    setIsViewModalOpen(true);
  };

  const handleJoin = () => {
    onJoin({
      id: gameId,
      creatorAvatar,
      creatorName,
      creatorItems: items,
      value,
      joinRangeMin,
      joinRangeMax,
      creatorSide,
      creator
    });
  };

  // Start countdown when game is completed
  useEffect(() => {
    if (winner && winningSide && !showCoinFlip) {
      setShowCountdown(true);
      setShowResult(false);
      setCountdown(3);
      
      // Countdown from 3 to 1
      const timer1 = setTimeout(() => setCountdown(2), 1000);
      const timer2 = setTimeout(() => setCountdown(1), 2000);
      const timer3 = setTimeout(() => {
        setShowCountdown(false);
        setShowCoinFlip(true);
      }, 3000);
      
      // Show result after coin flip animation (3s)
      const timer4 = setTimeout(() => {
        setShowResult(true);
      }, 6000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [winner, winningSide]);

  // =====================================================================
  // COMPLETED GAME CARD SECTION
  // =====================================================================
  // This section handles the display of completed/ended coinflip games.
  // It shows:
  // - Both players' avatars with their chosen sides (heads/tails)
  // - Winner indicated with green highlight and loser with red
  // - Combined items from both players (up to 4 shown, rest as +X)
  // - Total value of the game (combined from both players)
  // - View button to see full game details
  // The winner is determined by winningSide matching creatorSide
  // =====================================================================

  // If we have winner info, this is an ended game card
  if (winner && winningSide) {
    // Combine creator and joiner items
    const allItems = [...items, ...(joinerItems || [])];
    const displayedItems = allItems.slice(0, maxDisplayItems);
    const remainingItems = allItems.length - maxDisplayItems;

    return (
      <>
        <div className={`coinflip-card ended ${showResult ? (winningSide === creatorSide ? 'winner' : 'loser') : ''}`}>
          <div className="sides-container">
            <div className={`player-side ${showResult ? (winningSide === creatorSide ? 'winner' : 'loser') : ''}`}>
              <div className={`side-badge ${creatorSide} ${showResult ? (winningSide === creatorSide ? 'winner' : 'loser') : ''}`}>
                <img 
                  src={creatorSide === 'heads' ? HEADS_IMAGE_URL : TAILS_IMAGE_URL} 
                  alt={creatorSide} 
                  className="side-badge-image"
                />
              </div>
              <img src={creatorAvatar} alt="Creator" className="player-avatar" />
            </div>
            <span className="vs-text">VS</span>
            <div className={`player-side ${showResult ? (winningSide !== creatorSide ? 'winner' : 'loser') : ''}`}>
              <div className={`side-badge ${creatorSide === 'heads' ? 'tails' : 'heads'} ${showResult ? (winningSide !== creatorSide ? 'winner' : 'loser') : ''}`}>
                <img 
                  src={creatorSide === 'heads' ? TAILS_IMAGE_URL : HEADS_IMAGE_URL} 
                  alt={creatorSide === 'heads' ? 'tails' : 'heads'} 
                  className="side-badge-image"
                />
              </div>
              <img src={joinerAvatar} alt="Joiner" className="player-avatar" />
            </div>
          </div>

          <div className="items-container">
            {displayedItems.map((item, index) => (
              <img 
                key={index}
                src={item.image} 
                alt={item.name}
                className="item-image"
                title={item.name}
              />
            ))}
            {remainingItems > 0 && (
              <div className="remaining-items-circle">
                +{remainingItems}
              </div>
            )}
          </div>

          {showCountdown && (
            <div className="countdown-container">
              <div className="countdown-circle"></div>
              <div className="countdown-number">{countdown}</div>
            </div>
          )}

          {showCoinFlip && (
            <div className="result-circle-container">
              <div id="coin" className={winningSide}>
                <div className="side-a"></div>
                <div className="side-b"></div>
              </div>
            </div>
          )}

          <div className="value-container">
            <div className="game-value">
              <span className="value-text">{formatValue(totalValue)}</span>
            </div>
          </div>

          <div className="actions-container">
            <button className="view-button" onClick={handleView}>
              View
            </button>
          </div>
        </div>

        <CoinflipViewModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          game={{
            creatorAvatar,
            creatorName,
            joinerAvatar,
            joinerName,
            creatorItems: items,
            joinerItems: joinerItems || [],
            value,
            totalValue,
            id: gameId,
            _id: gameId,
            creatorSide,
            creator,
            hasJoined: true,
            winner,
            winningSide,
            state: 'ended'
          }}
        />
      </>
    );
  }

  // =====================================================================
  // ACTIVE GAME CARD SECTION
  // =====================================================================
  // This section handles the display of active/ongoing coinflip games.
  // It shows:
  // - Creator's avatar and their chosen side (heads/tails)
  // - Joiner's side (opposite of creator) with ? placeholder or avatar
  // - Creator's items (up to 4 shown, rest as +X)
  // - Game value and join range for potential joiners
  // - Join button (if not joined) and View button
  // The game remains active until someone joins and outcome is determined
  // =====================================================================

  // Regular active game card
  return (
    <>
      <div className={`coinflip-card ${hasJoined ? 'joined' : ''}`}>
        <div className="sides-container">
          <div className="player-side">
            <div className={`side-badge ${creatorSide}`}>
              <img 
                src={creatorSide === 'heads' ? HEADS_IMAGE_URL : TAILS_IMAGE_URL} 
                alt={creatorSide} 
                className="side-badge-image"
              />
            </div>
            <img src={creatorAvatar} alt="Creator" className="player-avatar" />
          </div>
          <span className="vs-text">VS</span>
          <div className="player-side">
            <div className={`side-badge ${creatorSide === 'heads' ? 'tails' : 'heads'}`}>
              <img 
                src={creatorSide === 'heads' ? TAILS_IMAGE_URL : HEADS_IMAGE_URL} 
                alt={creatorSide === 'heads' ? 'tails' : 'heads'} 
                className="side-badge-image"
              />
            </div>
            {hasJoined ? (
              <img src={joinerAvatar} alt="Joiner" className="player-avatar" />
            ) : (
              <div className="joiner-placeholder">?</div>
            )}
          </div>
        </div>

        <div className="items-container">
          {displayedItems.map((item, index) => (
            <img 
              key={index}
              src={item.image} 
              alt={item.name}
              className="item-image"
              title={item.name}
            />
          ))}
          {remainingItems > 0 && (
            <div className="remaining-items-circle">
              +{remainingItems}
            </div>
          )}
        </div>

        <div className="value-container">
          <div className="game-value">
            <span className="value-text">{formatValue(value)}</span>
          </div>
          {!hasJoined && (
            <div className="join-range">
              {formatValue(joinRangeMin).replace('💎 ', '')} - {formatValue(joinRangeMax).replace('💎 ', '')}
            </div>
          )}
        </div>

        <div className="actions-container">
          {!hasJoined && (
            <button className="join-button" onClick={handleJoin}>
              Join
            </button>
          )}
          <button className="view-button" onClick={handleView}>
            View
          </button>
        </div>
      </div>

      <CoinflipViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        game={{
          creatorAvatar,
          creatorName,
          joinerAvatar,
          joinerName,
          creatorItems: items,
          value,
          id: gameId,
          _id: gameId,
          creatorSide,
          creator,
          hasJoined,
          winner,
          winningSide
        }}
      />
    </>
  );
};

export default CoinflipCard; 

<style jsx>{`
  .result-circle-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 8px 0;
  }

  .result-circle {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(26, 31, 46, 0.95);
    border: 1px solid rgba(255, 184, 0, 0.3);
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 10px;
    font-weight: bold;
    color: #FFB800;
  }

  .result-circle-image {
    display: none;
  }
`}</style>