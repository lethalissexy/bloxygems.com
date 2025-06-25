import React from 'react';
import { formatValue } from '../utils/formatters';
import { COINFLIP_IMAGES } from '../constants/coinflip';
import { useDepositStore } from '../utils/depositHandler';

const CoinflipGame = ({ game, isMobile, isTablet }) => {
  const openDepositModal = useDepositStore(state => state.openDepositModal);

  const styles = {
    container: {
      background: '#1E2328',
      borderRadius: '8px',
      padding: isMobile ? '8px' : isTablet ? '10px' : '12px',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      gap: isMobile ? '8px' : isTablet ? '10px' : '0',
      minWidth: isMobile ? '280px' : isTablet ? '450px' : 'auto',
      maxWidth: '100%'
    },
    leftSection: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '6px' : isTablet ? '8px' : '12px',
      flexDirection: 'row',
      minWidth: 0,
      flex: 1
    },
    creatorContainer: {
      position: 'relative',
      width: isMobile ? '36px' : isTablet ? '42px' : '48px',
      height: isMobile ? '36px' : isTablet ? '42px' : '48px',
      flexShrink: 0
    },
    creatorCircle: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      border: '2px solid #FFB800',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: '#1E2328'
    },
    creatorText: {
      position: 'absolute',
      bottom: isMobile ? '-3px' : '-4px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1E2328',
      color: '#FFB800',
      fontSize: isMobile ? '7px' : isTablet ? '8px' : '10px',
      padding: isMobile ? '1px 3px' : '2px 4px',
      borderRadius: isMobile ? '3px' : '4px',
      whiteSpace: 'nowrap',
      border: '1px solid #FFB800'
    },
    avatar: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    },
    vs: {
      color: '#FFB800',
      fontSize: isMobile ? '12px' : isTablet ? '14px' : '16px',
      fontWeight: 'bold',
      margin: isMobile ? '0 2px' : '0 4px',
      flexShrink: 0
    },
    items: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '3px' : isTablet ? '6px' : '8px',
      flexWrap: 'nowrap',
      overflow: 'hidden',
      flex: 1,
      minWidth: 0
    },
    item: {
      width: isMobile ? '28px' : isTablet ? '36px' : '42px',
      height: isMobile ? '28px' : isTablet ? '36px' : '42px',
      borderRadius: '4px',
      background: 'rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
      flexShrink: 0
    },
    itemImage: {
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    },
    sideIcon: {
      width: isMobile ? '24px' : '32px',
      height: isMobile ? '24px' : '32px',
      flexShrink: 0
    },
    valueSection: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '4px' : isTablet ? '6px' : '8px',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: isMobile ? '2px' : '0',
      flexWrap: isMobile ? 'wrap' : 'nowrap'
    },
    value: {
      color: '#FFB800',
      fontSize: isMobile ? '14px' : isTablet ? '16px' : '18px',
      fontWeight: 'bold',
      fontFamily: "'Chakra Petch', sans-serif",
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      flexShrink: 0,
      minWidth: 0
    },
    buttonsContainer: {
      display: 'flex',
      gap: isMobile ? '4px' : '6px',
      flexShrink: 0
    },
    joinButton: {
      background: '#00E701',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      padding: isMobile ? '6px 12px' : isTablet ? '8px 16px' : '10px 20px',
      fontSize: isMobile ? '12px' : isTablet ? '13px' : '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      minWidth: isMobile ? '50px' : isTablet ? '60px' : '70px'
    },
    viewButton: {
      background: '#2A2F35',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      padding: isMobile ? '6px 12px' : isTablet ? '8px 16px' : '10px 20px',
      fontSize: isMobile ? '12px' : isTablet ? '13px' : '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      minWidth: isMobile ? '50px' : isTablet ? '60px' : '70px'
    },
    valueRange: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: isMobile ? '10px' : isTablet ? '11px' : '12px',
      marginTop: '0',
      width: '100%'
    },
    depositButton: {
      background: '#0095ff',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      padding: isMobile ? '6px 12px' : isTablet ? '8px 16px' : '10px 20px',
      fontSize: isMobile ? '12px' : isTablet ? '13px' : '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      minWidth: isMobile ? '50px' : isTablet ? '60px' : '70px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftSection}>
        <div style={styles.creatorContainer}>
          <div style={styles.creatorCircle}>
            {game.creatorAvatar ? (
              <img 
                src={game.creatorAvatar} 
                alt="Creator" 
                style={styles.avatar}
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                background: '#1E2328',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFB800'
              }}>
                C
              </div>
            )}
          </div>
          <div style={styles.creatorText}>Creator</div>
        </div>

        <span style={styles.vs}>VS</span>

        <div style={styles.items}>
          {game.creatorItems.slice(0, isMobile ? 3 : isTablet ? 4 : 5).map((item, index) => (
            <div key={index} style={styles.item}>
              <img src={item.image} alt={item.name} style={styles.itemImage} />
            </div>
          ))}
          {game.creatorItems.length > (isMobile ? 3 : isTablet ? 4 : 5) && (
            <span style={{
              color: 'rgba(255,255,255,0.6)', 
              fontSize: isMobile ? '11px' : isTablet ? '12px' : '14px',
              flexShrink: 0
            }}>
              +{game.creatorItems.length - (isMobile ? 3 : isTablet ? 4 : 5)}
            </span>
          )}
        </div>

        {!isMobile && (
        <img 
          src={COINFLIP_IMAGES[game.creatorSide.toLowerCase()]} 
          alt={game.creatorSide} 
          style={styles.sideIcon}
        />
        )}
      </div>

      <div style={styles.valueSection}>
        <div style={{
          display: 'flex', 
          flexDirection: 'column',
          minWidth: 0,
          flex: isMobile ? '1 1 100%' : '0 1 auto'
        }}>
          <span style={styles.value}>
            <span>💎</span>
            {formatValue(game.value)}
          </span>
          {(isMobile || isTablet) && (
            <span style={styles.valueRange}>
              {formatValue(game.value * 0.95)} - {formatValue(game.value * 1.05)}
            </span>
          )}
        </div>
        <div style={styles.buttonsContainer}>
          <button style={styles.depositButton} onClick={openDepositModal}>DEPOSIT</button>
        <button style={styles.joinButton}>JOIN</button>
        <button style={styles.viewButton}>VIEW</button>
        </div>
      </div>
    </div>
  );
};

export default CoinflipGame;
