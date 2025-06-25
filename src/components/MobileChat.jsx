import React, { useState } from 'react';
import Chat from './Chat';
import GiveawayListModal from './GiveawayListModal';

const MobileChat = ({ userInfo, onClose, isOpen }) => {
  const [showGiveawayList, setShowGiveawayList] = useState(false);

  const handleGiveawayClick = () => {
    setShowGiveawayList(true);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: isOpen ? 'block' : 'none',
      background: '#090B15'
    }}>
      <Chat 
        userInfo={userInfo}
        onClose={onClose}
        isMobile={true}
        isOpen={isOpen}
        onGiveawayClick={handleGiveawayClick}
      />

      {/* Giveaway List Modal for Mobile */}
      {showGiveawayList && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#090B15',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <GiveawayListModal
            isOpen={showGiveawayList}
            onClose={() => setShowGiveawayList(false)}
            userSession={userInfo}
          />
        </div>
      )}
    </div>
  );
};

export default MobileChat; 