import React, { useEffect } from 'react';

const styles = {
  container: {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    width: '90%',
    maxWidth: '400px',
    pointerEvents: 'none'
  },
  toast: {
    background: 'linear-gradient(135deg, #1a2035, #232b45)',
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    fontSize: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'slideIn 0.3s ease-out forwards'
  }
};

// Add styles to document head
const addStyles = () => {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(styleSheet);
};

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    addStyles();
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#4BB543';
      case 'error':
        return '#FF4B4B';
      case 'warning':
        return '#FFB800';
      default:
        return '#58a6ff';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto dismiss after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  return (
    <div style={styles.container}>
    <div style={{
        ...styles.toast,
        borderLeft: `3px solid ${getIconColor()}`
      }}>
        <span style={{ 
          color: getIconColor(),
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          {getIcon()}
        </span>
        <span style={{ flex: 1 }}>{message}</span>
      </div>
    </div>
  );
};

export default Toast; 