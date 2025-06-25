import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(5px)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    position: 'relative',
    width: '90%',
    maxWidth: '500px',
    background: '#1a1c24',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: "'Chakra Petch', sans-serif",
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#6c757d',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
    '&:hover': {
      color: '#fff',
    },
  },
  botSection: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  botInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  botAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.1)',
  },
  botName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#43b581',
    boxShadow: '0 0 8px rgba(67, 181, 129, 0.4)',
  },
  joinButton: {
    background: '#0095ff',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textDecoration: 'none',
    '&:hover': {
      background: '#0077cc',
      transform: 'translateY(-2px)',
    },
  },
  infoText: {
    color: '#8b949e',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '24px',
    lineHeight: '1.5',
  },
};

const DepositModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.overlay}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          style={styles.modal}
          onClick={e => e.stopPropagation()}
        >
          <div style={styles.header}>
            <h2 style={styles.title}>DEPOSIT</h2>
            <button style={styles.closeButton} onClick={onClose}>×</button>
          </div>

          <div style={styles.botSection}>
            <div style={styles.botInfo}>
              <img
                src="https://tr.rbxcdn.com/30DAY-AvatarHeadshot-A373AE919CABA0EAE4998BE537115D46-Png/150/150/AvatarHeadshot/Webp/noFilter"
                alt="Bot Avatar"
                style={styles.botAvatar}
              />
              <div style={styles.botName}>
                safty_09
                <div style={styles.statusDot} />
              </div>
            </div>
            <a
              href="https://www.roblox.com/users/8370996748/profile"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.joinButton}
            >
              Join
            </a>
          </div>

          <div style={{...styles.infoText, fontSize: '12px', marginTop: '12px'}}>
            Always verify that the username of your trading partner matches exactly; users often impersonate bots with similar names.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DepositModal;