import React, { useState } from 'react';
import { formatTimeAgo, formatValueCompact } from '../utils/formatters';

const GiveawayListModal = ({ isOpen, onClose, giveaways = [], endedGiveaways = [], onJoinGiveaway, userSession }) => {
  const [activeTab, setActiveTab] = useState('active');

  if (!isOpen) return null;

  const formatTimeRemaining = (endTime) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 1) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Check if we're on mobile
  const isMobile = window.innerWidth <= 768;

  return (
    <div className="giveaway-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isMobile ? '#090B15' : 'rgba(13, 16, 31, 0.85)',
        backdropFilter: isMobile ? 'none' : 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer'
      }}>
      <div style={{
        width: isMobile ? '100%' : '90%',
        maxWidth: isMobile ? '100%' : '900px',
        height: isMobile ? '100%' : '85vh',
        maxHeight: isMobile ? '100%' : '85vh',
        background: isMobile ? '#090B15' : 'linear-gradient(135deg, rgba(18, 21, 32, 0.98) 0%, rgba(13, 16, 27, 0.98) 100%)',
        border: isMobile ? 'none' : '1px solid rgba(255, 184, 0, 0.15)',
        borderRadius: isMobile ? '0' : '12px',
        boxShadow: isMobile ? 'none' : '0 10px 25px rgba(0, 0, 0, 0.6)',
        zIndex: 1000,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'default'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          background: 'linear-gradient(90deg, rgba(22, 26, 40, 0.95) 0%, rgba(16, 19, 31, 0.95) 100%)',
          padding: '15px 20px',
          borderBottom: '1px solid rgba(255, 184, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            color: '#FFB800',
            fontSize: '18px',
            fontWeight: '700',
            margin: 0,
            fontFamily: "'Chakra Petch', sans-serif"
          }}>Giveaways</h2>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: '#B8C3E6',
            fontSize: '22px',
            cursor: 'pointer',
            padding: '0'
          }} onClick={onClose}>×</button>
        </div>

        <div style={{
          padding: '20px',
          overflowY: 'auto',
          height: isMobile ? 'calc(100% - 120px)' : 'calc(85vh - 120px)',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 184, 0, 0.2)',
            marginBottom: '15px'
          }}>
            <div 
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab === 'active' ? '#FFB800' : '#8D98B3',
                borderBottom: `2px solid ${activeTab === 'active' ? '#FFB800' : 'transparent'}`,
                transition: 'all 0.2s ease'
              }}
              onClick={() => setActiveTab('active')}
            >
              Active Giveaways
            </div>
            <div 
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab === 'ended' ? '#FFB800' : '#8D98B3',
                borderBottom: `2px solid ${activeTab === 'ended' ? '#FFB800' : 'transparent'}`,
                transition: 'all 0.2s ease'
              }}
              onClick={() => setActiveTab('ended')}
            >
              Ended Giveaways
            </div>
          </div>

          {/* Active Giveaways */}
          {activeTab === 'active' ? (
            giveaways.length > 0 ? (
              giveaways.map(giveaway => (
                <div 
                  key={giveaway._id} 
                  style={{
                    background: 'rgba(14, 17, 27, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '12px 15px',
                    marginBottom: '10px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.border = '1px solid rgba(255, 184, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{
                        color: '#8D98B3',
                        fontSize: '13px',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span>Created by</span>
                        <span style={{ 
                          color: '#FFB800', 
                          fontWeight: '600',
                          fontFamily: "'Chakra Petch', sans-serif",
                        }}>
                          {giveaway.creatorName || giveaway.creatorUsername}
                        </span>
                      </div>
                      <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '5px' }}>
                        {giveaway.items.length} items ({giveaway.numWinners} winner{giveaway.numWinners > 1 ? 's' : ''})
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          color: '#FFB800', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(255, 184, 0, 0.1)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 184, 0, 0.2)'
                        }}>
                          <span style={{ fontSize: '15px' }}>💎</span>
                          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: '600' }}>
                            {formatValueCompact(giveaway.totalValue)}
                          </span>
                        </div>
                        <div style={{
                          color: '#00FF9D',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(0, 255, 157, 0.1)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(0, 255, 157, 0.2)'
                        }}>
                          <span style={{ fontSize: '15px' }}>⏱️</span>
                          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: '600' }}>
                            {formatTimeRemaining(giveaway.endTime)}
                          </span>
                        </div>
                        <div style={{ 
                          color: '#B8C3E6', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(184, 195, 230, 0.1)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(184, 195, 230, 0.2)'
                        }}>
                          <span style={{ fontSize: '15px' }}>👥</span>
                          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: '500' }}>
                            {giveaway.participantCount || giveaway.participants?.length || 0} joined
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      style={{
                        background: giveaway.joined 
                          ? 'rgba(0, 255, 157, 0.2)' 
                          : giveaway.isJoining
                            ? 'rgba(255, 184, 0, 0.5)'
                            : 'linear-gradient(135deg, #FFB800 0%, #FF9500 100%)',
                        color: giveaway.joined 
                          ? '#00FF9D' 
                          : giveaway.isJoining
                            ? '#333'
                            : '#000',
                        border: giveaway.joined 
                          ? '1px solid #00FF9D' 
                          : giveaway.isJoining
                            ? '1px solid rgba(255, 184, 0, 0.7)'
                            : 'none',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: giveaway.joined || giveaway.isJoining ? 'default' : 'pointer',
                        textTransform: 'uppercase',
                        opacity: giveaway.joined ? 0.7 : 1,
                      }}
                      onClick={() => !giveaway.joined && !giveaway.isJoining && onJoinGiveaway(giveaway._id)}
                      disabled={giveaway.joined || giveaway.isJoining}
                    >
                      {giveaway.joined 
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontSize: '12px' }}>✓</span> Joined
                          </span> 
                        : giveaway.isJoining
                          ? 'Joining...'
                          : 'Join'
                      }
                    </button>
                  </div>
                  
                  {/* Item previews */}
                  {giveaway.items.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px', overflowX: 'auto', padding: '5px 0' }}>
                      {giveaway.items.slice(0, 10).map((item, index) => (
                        <img 
                          key={index}
                          src={item.image} 
                          alt={item.name}
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '4px',
                            objectFit: 'contain',
                            background: 'rgba(0, 0, 0, 0.2)',
                          }}
                          title={`${item.name} (${formatValueCompact(item.value)})`}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAA70lEQVR4nO3bMQ0AIAxAwQFKHfizQgg4YKQJnL9k086xvPeey3bo5nUAnAkJIyQMIWGEhCEkDCFhCAlDSBhCwhASRkj9OJww01uGkBk/JIyQMELCEBKGkDCEhCEkDCFhCAlDSBhCwggJQ0gYQsIQEoaQMISEISQMIWEICUNIGELCEBKGkDCEhCEkDCFhCAlDSBhCwhASxgkjjB8SRkgYQsIQEoaQMISEISQMIWEICUNIGELCCAlDSBhCwhASRkgYQsIQEoaQMISEISQMIWEICUNIGELCEBKGkDCEhCEkDCFhCAlDSBhCwhASxgkzrw89nwHH54BK9AAAAABJRU5ErkJggg==';
                          }}
                        />
                      ))}
                      {giveaway.items.length > 10 && (
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0, 0, 0, 0.2)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          +{giveaway.items.length - 10}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ 
                padding: '30px', 
                textAlign: 'center', 
                color: '#8D98B3', 
                fontSize: '16px' 
              }}>
                No active giveaways at the moment
              </div>
            )
          ) : (
            // Ended Giveaways
            endedGiveaways.length > 0 ? (
              endedGiveaways.map(giveaway => (
                <div 
                  key={giveaway._id} 
                  style={{
                    background: 'rgba(16, 19, 30, 0.6)',
                    border: '1px solid rgba(77, 159, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '12px 15px',
                    marginBottom: '10px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                >
                  {/* Same content structure as active giveaways but with ended status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{
                        color: '#8D98B3',
                        fontSize: '13px',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span>Created by</span>
                        <span style={{ 
                          color: '#FFB800', 
                          fontWeight: '600',
                          fontFamily: "'Chakra Petch', sans-serif",
                        }}>
                          {giveaway.creatorName || giveaway.creatorUsername}
                        </span>
                      </div>
                      <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '5px' }}>
                        {giveaway.items.length} items ({giveaway.numWinners} winner{giveaway.numWinners > 1 ? 's' : ''})
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          color: '#FFB800', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(255, 184, 0, 0.1)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 184, 0, 0.2)'
                        }}>
                          <span style={{ fontSize: '15px' }}>💎</span>
                          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: '600' }}>
                            {formatValueCompact(giveaway.totalValue)}
                          </span>
                        </div>
                        <div style={{ 
                          color: '#FF6B6B', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(255, 107, 107, 0.1)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 107, 107, 0.2)'
                        }}>
                          <span style={{ fontSize: '15px' }}>⏱️</span>
                          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: '600' }}>
                            Ended
                          </span>
                        </div>
                        <div style={{ 
                          color: '#B8C3E6', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(184, 195, 230, 0.1)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(184, 195, 230, 0.2)'
                        }}>
                          <span style={{ fontSize: '15px' }}>👥</span>
                          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: '500' }}>
                            {giveaway.participantCount || giveaway.participants?.length || 0} joined
                          </span>
                        </div>
                      </div>

                      {/* Winners section */}
                      {giveaway.winners && giveaway.winners.length > 0 && (
                        <div style={{
                          color: '#4D9FFF',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginTop: '8px',
                          background: 'rgba(77, 159, 255, 0.1)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(77, 159, 255, 0.2)'
                        }}>
                          <span style={{ fontSize: '15px' }}>🏆</span>
                          <span style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                            Winner{giveaway.winners.length > 1 ? 's' : ''}: 
                            <span style={{ color: '#fff', marginLeft: '5px', fontWeight: '500' }}>
                              {giveaway.winners.map(w => w.username).join(', ')}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '5px 10px',
                      background: 'rgba(77, 159, 255, 0.2)',
                      color: '#4D9FFF',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      Ended
                    </div>
                  </div>

                  {/* Item previews */}
                  {giveaway.items.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px', overflowX: 'auto', padding: '5px 0' }}>
                      {giveaway.items.slice(0, 10).map((item, index) => (
                        <img 
                          key={index}
                          src={item.image} 
                          alt={item.name}
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '4px',
                            objectFit: 'contain',
                            background: 'rgba(0, 0, 0, 0.2)',
                          }}
                          title={`${item.name} (${formatValueCompact(item.value)})`}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAA70lEQVR4nO3bMQ0AIAxAwQFKHfizQgg4YKQJnL9k086xvPeey3bo5nUAnAkJIyQMIWGEhCEkDCFhCAlDSBhCwhASRkj9OJww01uGkBk/JIyQMELCEBKGkDCEhCEkDCFhCAlDSBhCwggJQ0gYQsIQEoaQMISEISQMIWEICUNIGELCEBKGkDCEhCEkDCFhCAlDSBhCwhASxgkjjB8SRkgYQsIQEoaQMISEISQMIWEICUNIGELCCAlDSBhCwhASRkgYQsIQEoaQMISEISQMIWEICUNIGELCEBKGkDCEhCEkDCFhCAlDSBhCwhASxgkzrw89nwHH54BK9AAAAABJRU5ErkJggg==';
                          }}
                        />
                      ))}
                      {giveaway.items.length > 10 && (
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0, 0, 0, 0.2)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          +{giveaway.items.length - 10}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ 
                padding: '30px', 
                textAlign: 'center', 
                color: '#8D98B3', 
                fontSize: '16px' 
              }}>
                No ended giveaways to display
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default GiveawayListModal; 