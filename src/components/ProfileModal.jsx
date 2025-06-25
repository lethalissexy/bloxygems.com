import React, { useState, useEffect } from 'react';
import { formatValueCompact } from '../utils/formatters';

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 16, 31, 0.95)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modal: {
    background: 'linear-gradient(180deg, #0d1117 0%, rgba(13, 16, 31, 0.95) 100%)',
    borderRadius: '16px',
    padding: '20px',
    width: '90%',
    maxWidth: '400px',
    position: 'relative',
    border: '1px solid rgba(255, 184, 0, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 100px rgba(255, 184, 0, 0.1)',
    '@media (max-width: 768px)': {
      width: '100%',
      height: 'auto',
      borderRadius: '16px 16px 0 0',
      position: 'fixed',
      bottom: 0,
      animation: 'slideUp 0.3s ease-out'
    }
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    color: '#FFB800',
    fontWeight: 'bold',
    fontFamily: "'Chakra Petch', sans-serif"
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#B8C3E6',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'color 0.2s ease'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px'
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: '2px solid #FFB800',
    boxShadow: '0 0 15px rgba(255, 184, 0, 0.2)'
  },
  userDetails: {
    flex: 1
  },
  username: {
    fontSize: '20px',
    color: '#FFB800',
    fontWeight: 'bold',
    marginBottom: '4px',
    fontFamily: "'Chakra Petch', sans-serif"
  },
  displayName: {
    fontSize: '16px',
    color: '#B8C3E6'
  },
  tipButton: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #FFB800, #FFDB1C)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Chakra Petch', sans-serif",
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 15px rgba(255, 184, 0, 0.3)'
    }
  }
};

const addKeyframes = () => {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);
};

const ProfileModal = ({ isOpen, onClose, user, loading, onTipClick }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    addKeyframes();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2 style={styles.title}>Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2 style={styles.title}>User not found</h2>
            <button style={styles.closeButton} onClick={onClose}>×</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div 
        style={{
          ...styles.modal,
          ...(isMobile && {
            bottom: 0,
            borderRadius: '16px 16px 0 0',
            animation: 'slideUp 0.3s ease-out'
          })
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>Profile</h2>
          <button 
            style={styles.closeButton} 
            onClick={onClose}
            onMouseEnter={e => e.target.style.color = '#FFB800'}
            onMouseLeave={e => e.target.style.color = '#B8C3E6'}
          >
            ×
          </button>
        </div>

        <div style={styles.userInfo}>
          <img 
            src={user.avatar} 
            alt={user.username} 
            style={styles.avatar}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'default-avatar.png';
            }}
          />
          <div style={styles.userDetails}>
            <div style={styles.username}>{user.username}</div>
            <div style={styles.displayName}>{user.displayName}</div>
          </div>
        </div>

        <button 
          style={styles.tipButton}
          onClick={() => {
            onClose();
            onTipClick(user);
          }}
        >
          Send Tip
        </button>
      </div>
    </div>
  );
};

export default ProfileModal; 