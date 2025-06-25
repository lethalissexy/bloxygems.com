import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const styles = {
  container: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto 2rem auto',
    padding: '0 1rem',
    position: 'relative',
    zIndex: 1
  },
  announcement: {
    background: 'linear-gradient(135deg, rgba(26, 32, 53, 0.95) 0%, rgba(20, 24, 40, 0.85) 100%)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid',
    borderRadius: '8px',
    padding: '1.2rem 1.5rem',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    fontSize: '0.95rem',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
    transform: 'translateY(0)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)'
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
      transform: 'translateX(-100%)',
      transition: 'transform 0.5s'
    },
    '&:hover::before': {
      transform: 'translateX(100%)'
    }
  },
  icon: {
    fontSize: '1.4rem',
    flexShrink: 0,
    marginTop: '0.2rem',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
  },
  content: {
    flex: 1,
    wordBreak: 'break-word',
    color: '#B8C3E6',
    lineHeight: '1.5',
    letterSpacing: '0.01em'
  },
  timestamp: {
    fontSize: '0.75rem',
    opacity: 0.7,
    marginTop: '0.6rem',
    color: '#8A94B0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontFamily: "'Chakra Petch', sans-serif",
    '&::before': {
      content: '""',
      display: 'block',
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: 'currentColor',
      opacity: 0.5
    }
  }
};

// Style variants for different announcement types
const typeStyles = {
  info: {
    borderColor: 'rgba(52, 152, 219, 0.15)',
    background: 'linear-gradient(135deg, rgba(26, 32, 53, 0.95) 0%, rgba(20, 24, 40, 0.85) 100%)',
    color: '#3498db',
    icon: 'ℹ️'
  },
  warning: {
    borderColor: 'rgba(255, 184, 0, 0.15)',
    background: 'linear-gradient(135deg, rgba(35, 32, 20, 0.95) 0%, rgba(40, 34, 20, 0.85) 100%)',
    color: '#FFB800',
    icon: '⚠️'
  },
  success: {
    borderColor: 'rgba(46, 204, 113, 0.15)',
    background: 'linear-gradient(135deg, rgba(20, 35, 25, 0.95) 0%, rgba(20, 40, 25, 0.85) 100%)',
    color: '#2ecc71',
    icon: '✅'
  },
  error: {
    borderColor: 'rgba(231, 76, 60, 0.15)',
    background: 'linear-gradient(135deg, rgba(35, 20, 20, 0.95) 0%, rgba(40, 20, 20, 0.85) 100%)',
    color: '#e74c3c',
    icon: '❌'
  }
};

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Fetch initial announcements
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        setAnnouncements(data.sort((a, b) => b.priority - a.priority));
      })
      .catch(console.error);

    // Connect to Socket.IO
    const SOCKET_URL = '/';
    const newSocket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      upgrade: true
    });

    newSocket.on('connect', () => {
      console.log('Announcements socket connected to', SOCKET_URL);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Announcements socket error:', error);
    });

    newSocket.on('new_announcement', (announcement) => {
      setAnnouncements(prev => {
        const newAnnouncements = [announcement, ...prev];
        return newAnnouncements.sort((a, b) => b.priority - a.priority);
      });
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  const formatTimestamp = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      {announcements.map((announcement, index) => {
        const typeStyle = typeStyles[announcement.type] || typeStyles.info;
        return (
          <div
            key={announcement.id}
            style={{
              ...styles.announcement,
              ...typeStyle,
              opacity: announcement.active ? 1 : 0.5,
              animation: `slideIn 0.3s ease-out forwards ${index * 0.1}s`
            }}
          >
            <span style={styles.icon}>{typeStyle.icon}</span>
            <div style={styles.content}>
              {announcement.content}
              <div style={styles.timestamp}>
                {formatTimestamp(announcement.createdAt)}
              </div>
            </div>
          </div>
        );
      })}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}

export default Announcements; 