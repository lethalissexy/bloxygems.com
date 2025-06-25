import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Wallet from './Wallet';
import axios from 'axios';
import { formatValue, formatValueCompact } from '../utils/formatters';
import { io } from 'socket.io-client';
import LoadingSpinner from './LoadingSpinner';
import GiveawayModal from './GiveawayModal';
import MilestoneRewards from './MilestoneRewards';

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 2.5rem',
    background: '#1E2328',
    position: 'fixed',
    top: 0,
    left: 0,
    right: '0',
    height: '80px',
    zIndex: 1000
  },
  navbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem'
  },
  navbarCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)'
  },
  navbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginLeft: 'auto'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    padding: '0',
    marginLeft: '-1rem',
    '&:hover': {
      transform: 'translateY(-2px)'
    }
  },
  brandLogo: {
    height: '100px',
    width: 'auto',
    marginTop: '0.5rem',
    filter: 'drop-shadow(0 0 20px rgba(255, 184, 0, 0.4))',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'scale(1.05)',
      filter: 'drop-shadow(0 0 25px rgba(255, 184, 0, 0.6))'
    }
  },
  brandText: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px'
  },
  bloxText: {
    color: '#FFB800',
    fontSize: '1.8rem',
    fontWeight: '800',
    textShadow: `
      0 0 15px rgba(255, 184, 0, 0.4),
      0 0 30px rgba(255, 184, 0, 0.2)
    `,
    fontFamily: "'Chakra Petch', sans-serif",
    letterSpacing: '0.5px'
  },
  coinsText: {
    color: '#fff',
    fontSize: '1.8rem',
    fontWeight: '800',
    textShadow: `
      0 0 15px rgba(255, 255, 255, 0.2),
      0 0 30px rgba(255, 255, 255, 0.1)
    `,
    fontFamily: "'Chakra Petch', sans-serif",
    letterSpacing: '0.5px'
  },
  navItems: {
    display: 'flex',
    gap: '2.5rem',
    alignItems: 'center',
    position: 'relative',
    minWidth: 'max-content',
    '@media (max-width: 1200px)': {
      gap: '1.5rem',
    }
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: '#B8C3E6',
    cursor: 'pointer',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: "'Chakra Petch', sans-serif",
    position: 'relative',
    background: 'linear-gradient(145deg, rgba(255, 184, 0, 0.05), transparent)',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
    '&:hover': {
      color: '#FFB800',
      background: 'linear-gradient(145deg, rgba(255, 184, 0, 0.1), rgba(255, 184, 0, 0.05))',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 20px rgba(255, 184, 0, 0.1)'
    }
  },
  navValue: {
    background: 'rgba(9, 11, 21, 0.9)',
    border: '1px solid rgba(255, 184, 0, 0.3)',
    borderRadius: '4px',
    padding: '0.3rem 0.8rem',
    color: '#FFB800',
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: "'Chakra Petch', sans-serif",
    letterSpacing: '1px',
    boxShadow: `
      0 4px 15px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 184, 0, 0.1)
    `,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 6px 20px rgba(255, 184, 0, 0.15)'
    }
  },
  newBadge: {
    background: 'linear-gradient(135deg, #FFB800 0%, #FFC93C 100%)',
    color: '#000',
    padding: '0.3rem 0.7rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
    fontFamily: "'Chakra Petch', sans-serif",
    boxShadow: `
      0 4px 12px rgba(255, 184, 0, 0.3),
      0 0 0 1px rgba(255, 184, 0, 0.2)
    `,
    animation: 'pulse 2s infinite',
    '@keyframes pulse': {
      '0%': {
        boxShadow: '0 4px 12px rgba(255, 184, 0, 0.3)'
      },
      '50%': {
        boxShadow: '0 4px 20px rgba(255, 184, 0, 0.5)'
      },
      '100%': {
        boxShadow: '0 4px 12px rgba(255, 184, 0, 0.3)'
      }
    }
  },
  comingSoonBadge: {
    background: 'linear-gradient(135deg, #FFB800 0%, #FFC93C 100%)',
    color: '#000',
    padding: '0.3rem 0.7rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
    fontFamily: "'Chakra Petch', sans-serif",
    boxShadow: `
      0 4px 12px rgba(255, 184, 0, 0.3),
      0 0 0 1px rgba(255, 184, 0, 0.2)
    `,
    animation: 'pulse 2s infinite',
    '@keyframes pulse': {
      '0%': {
        boxShadow: '0 4px 12px rgba(255, 184, 0, 0.3)'
      },
      '50%': {
        boxShadow: '0 4px 20px rgba(255, 184, 0, 0.5)'
      },
      '100%': {
        boxShadow: '0 4px 12px rgba(255, 184, 0, 0.3)'
      }
    }
  },
  balanceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'linear-gradient(145deg, rgba(13, 16, 31, 0.95), rgba(18, 21, 40, 0.95))',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 184, 0, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 15px rgba(255, 184, 0, 0.1)',
    '&:hover': {
      background: 'linear-gradient(145deg, rgba(13, 16, 31, 0.98), rgba(18, 21, 40, 0.98))',
      border: '1px solid rgba(255, 184, 0, 0.3)',
      boxShadow: '0 6px 20px rgba(255, 184, 0, 0.15)',
      transform: 'translateY(-1px)'
    }
  },
  balanceIcon: {
    fontSize: '18px',
    color: '#FFB800',
    filter: 'drop-shadow(0 2px 4px rgba(255, 184, 0, 0.3))',
  },
  balanceAmount: {
    color: '#FFB800',
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    fontFamily: "'Chakra Petch', sans-serif"
  },
  addButton: {
    background: 'linear-gradient(135deg, #FFB800, #FFDB1C)',
    color: '#0D101F',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 8px rgba(255, 184, 0, 0.2)',
    fontFamily: "'Chakra Petch', sans-serif",
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(255, 184, 0, 0.3)'
    }
  },
  walletButton: {
    background: 'linear-gradient(135deg, #FFB800 0%, #FFC93C 100%)',
    color: '#0D101F',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: "'Chakra Petch', sans-serif",
    letterSpacing: '0.5px',
    boxShadow: '0 4px 12px rgba(255, 184, 0, 0.15)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 15px rgba(255, 184, 0, 0.25)',
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: '0 2px 8px rgba(255, 184, 0, 0.15)',
    }
  },
  loginButton: {
    background: 'linear-gradient(135deg, #FFB800 0%, #FFDB1C 100%)',
    color: '#000',
    border: 'none',
    padding: '0.8rem 2.2rem',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: "'Chakra Petch', sans-serif",
    letterSpacing: '1px',
    boxShadow: '0 4px 20px rgba(255, 184, 0, 0.2)',
    position: 'relative',
    overflow: 'hidden',
    marginLeft: 'auto',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 25px rgba(255, 184, 0, 0.3)'
    }
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(9, 11, 21, 0.85)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'linear-gradient(145deg, rgba(9, 11, 21, 0.95), rgba(15, 18, 34, 0.95))',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 184, 0, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
    fontFamily: "'Chakra Petch', sans-serif"
  },
  modalTitle: {
    color: '#FFB800',
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
    fontWeight: '600'
  },
  inputContainer: {
    marginBottom: '1.5rem'
  },
  inputLabel: {
    color: '#B8C3E6',
    marginBottom: '0.5rem',
    display: 'block',
    fontSize: '0.9rem'
  },
  inputField: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(9, 11, 21, 0.8)',
    border: '1px solid rgba(255, 184, 0, 0.3)',
    borderRadius: '6px',
    color: '#FFB800',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    '&:focus': {
      borderColor: '#FFB800',
      boxShadow: '0 0 0 2px rgba(255, 184, 0, 0.2)'
    }
  },
  submitButton: {
    width: '100%',
    padding: '0.75rem',
    background: '#FFB800',
    border: 'none',
    borderRadius: '6px',
    color: '#090B15',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#FFC93C'
    },
    '&:disabled': {
      background: '#665000',
      cursor: 'not-allowed'
    }
  },
  errorMessage: {
    color: '#FF4B4B',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    padding: '0.5rem',
    background: 'rgba(255, 75, 75, 0.1)',
    borderRadius: '4px',
    textAlign: 'center'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '1rem',
    background: 'rgba(255, 184, 0, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 184, 0, 0.2)'
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '2px solid #FFB800',
    boxShadow: '0 0 10px rgba(255, 184, 0, 0.3)'
  },
  userDetails: {
    flex: 1
  },
  username: {
    color: '#FFB800',
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '0.2rem'
  },
  displayName: {
    color: '#B8C3E6',
    fontSize: '0.9rem'
  },
  verificationBox: {
    background: 'rgba(9, 11, 21, 0.9)',
    border: '1px solid rgba(255, 184, 0, 0.3)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  verificationTitle: {
    color: '#FFB800',
    fontSize: '0.9rem',
    marginBottom: '0.5rem'
  },
  verificationCode: {
    color: '#FFFFFF',
    fontSize: '0.9rem',
    fontFamily: 'monospace',
    padding: '0.5rem',
    background: 'rgba(255, 184, 0, 0.1)',
    borderRadius: '4px',
    marginBottom: '0.5rem',
    wordBreak: 'break-all'
  },
  copyButton: {
    background: 'transparent',
    border: '1px solid rgba(255, 184, 0, 0.3)',
    borderRadius: '4px',
    color: '#FFB800',
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(255, 184, 0, 0.1)'
    }
  },
  steps: {
    marginBottom: '1.5rem',
    padding: '0.5rem'
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    color: '#B8C3E6',
    fontSize: '0.9rem'
  },
  stepNumber: {
    color: '#FFB800',
    fontWeight: '600'
  },
  loadingSpinner: {
    width: '24px',
    height: '24px',
    margin: '0 auto 1rem',
    border: '3px solid rgba(255, 184, 0, 0.1)',
    borderTop: '3px solid #FFB800',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  userContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(145deg, rgba(13, 16, 31, 0.95), rgba(18, 21, 40, 0.95))',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(0, 102, 255, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(0, 102, 255, 0.1)',
    marginLeft: '0',
    '&:hover': {
      background: 'linear-gradient(145deg, rgba(13, 16, 31, 0.98), rgba(18, 21, 40, 0.98))',
      border: '1px solid rgba(0, 102, 255, 0.3)',
      boxShadow: '0 6px 20px rgba(0, 102, 255, 0.15)',
      transform: 'translateY(-1px)'
    }
  },
  userAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid rgba(0, 102, 255, 0.3)',
    objectFit: 'cover'
  },
  userName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'rgba(13, 16, 31, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '6px',
    minWidth: '160px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: "'Inter', sans-serif",
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.1)',
    }
  },
  walletLink: {
    textDecoration: 'none',
    color: 'inherit'
  },
  copyNotification: {
    position: 'absolute',
    bottom: '-40px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255, 184, 0, 0.9)',
    color: '#000',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    animation: 'fadeInOut 2s ease',
    zIndex: 1001
  },
  termsContainer: {
    marginTop: '1rem',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem'
  },
  termsCheckbox: {
    marginTop: '0.2rem',
    accentColor: '#FFB800',
    cursor: 'pointer'
  },
  termsText: {
    color: '#B8C3E6',
    fontSize: '0.9rem',
    lineHeight: '1.4'
  },
  termsLink: {
    color: '#FFB800',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline'
    }
  },
  modalSteps: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  modalStep: {
    width: '100px',
    textAlign: 'center',
    padding: '0.5rem',
    borderBottom: '2px solid transparent',
    cursor: 'pointer'
  },
  timerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  timerLabel: {
    marginRight: '0.5rem',
    color: '#B8C3E6',
    fontSize: '0.9rem'
  },
  timer: {
    fontSize: '1.2rem',
    fontWeight: '600'
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  errorIcon: {
    color: '#FF4B4B',
    fontSize: '1.2rem'
  },
  buttonSpinner: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  },
  copyIcon: {
    marginRight: '0.5rem',
    fontSize: '1.2rem'
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: '80px',
    bottom: 0,
    width: '80px',
    background: '#1E2328',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0 1rem 0',
    zIndex: 999
  },
  sidebarButton: {
    width: '50px',
    height: '50px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#161B22',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    marginBottom: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: '#B8C3E6',
    '&:hover': {
      transform: 'translateY(-2px)',
      background: '#1E2328',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      color: '#FFB800'
    }
  },
  sidebarIcon: {
    fontSize: '20px',
    marginBottom: '4px'
  },
  sidebarText: {
    fontSize: '10px',
    fontWeight: '600'
  },
  discordSection: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },
  discordIcon: {
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    transition: 'transform 0.3s ease',
    '&:hover': {
      transform: 'scale(1.1)'
    }
  },
};

const WalletDisplay = ({ userInfo, totalValue, onWalletClick }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={styles.balanceContainer} onClick={onWalletClick}>
      <div style={styles.balanceAmount}>
        <span style={styles.balanceIcon}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 0L10.2 4.8L15.2 5.6L11.6 9.2L12.4 14.4L8 12L3.6 14.4L4.4 9.2L0.8 5.6L5.8 4.8L8 0Z" fill="url(#diamond-gradient)"/>
            <defs>
              <linearGradient id="diamond-gradient" x1="0.8" y1="0" x2="15.2" y2="14.4" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFB800"/>
                <stop offset="1" stopColor="#FFDB1C"/>
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span style={{ color: '#FFD700' }}>{userInfo ? formatValueCompact(userInfo.balance || totalValue || 0) : '0'}</span>
      </div>
    </div>
    <button style={styles.addButton} onClick={onWalletClick}>
      <span>+</span>
      Wallet
    </button>
  </div>
  );

function Navbar({ openMilestones, isChatOpen, setIsChatOpen, userInfo }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationPhrase, setVerificationPhrase] = useState('');
  const [tempUserInfo, setTempUserInfo] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [coinflipValue, setCoinflipValue] = useState(5977500000);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loginStep, setLoginStep] = useState(1);
  const [verificationTimer, setVerificationTimer] = useState(0);
  const socketRef = useRef(null);
  const [isGiveawayModalOpen, setIsGiveawayModalOpen] = useState(false);
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Connect to the backend explicitly rather than the same URL as your app
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://bloxroll-development.onrender.com';
  socketRef.current = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    upgrade: true
  });

  socketRef.current.on('connect', () => {
    console.log('Navbar socket connected to', SOCKET_URL);
  });

  socketRef.current.on('connect_error', (error) => {
    console.error('Navbar socket error:', error);
  });

  // Listen for value updates
  socketRef.current.on('value_update', (data) => {
    if (data.inventory && userInfo?.id === data.userId) {
      // Calculate directly from inventory if available
      const mm2Items = data.inventory.mm2Items || [];
      const ps99Items = data.inventory.ps99Items || [];
      
      const mm2Value = mm2Items.reduce((total, item) => total + Math.max(0, (item.value || 0)), 0);
      const ps99Value = ps99Items.reduce((total, item) => total + Math.max(0, (item.value || 0)), 0);
      const calculatedTotalValue = Math.max(0, mm2Value + ps99Value);
      
      setTotalValue(calculatedTotalValue);
    } else if (data.totalValue !== undefined) {
      // Fallback to using the provided totalValue
      setTotalValue(Math.max(0, data.totalValue));
    }
    if (data.coinflipValue !== undefined) {
      setCoinflipValue(Math.max(0, data.coinflipValue));
    }
  });

  // Listen for specific user value updates
  socketRef.current.on('user_value_update', (data) => {
    if (userInfo?.id === data.userId) {
      // If we receive inventory items in the update, calculate the value directly
      if (data.inventory) {
        const mm2Items = data.inventory.mm2Items || [];
        const ps99Items = data.inventory.ps99Items || [];
        
        const mm2Value = mm2Items.reduce((total, item) => total + Math.max(0, (item.value || 0)), 0);
        const ps99Value = ps99Items.reduce((total, item) => total + Math.max(0, (item.value || 0)), 0);
        const calculatedTotalValue = Math.max(0, mm2Value + ps99Value);
        
        setTotalValue(calculatedTotalValue);
      } else if (data.totalValue !== undefined) {
        // Fallback to using the provided totalValue if inventory isn't available
        setTotalValue(Math.max(0, data.totalValue));
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Initial fetch of user's total value when logged in
  useEffect(() => {
    const fetchUserValue = async () => {
      if (userInfo?.id) {
        try {
          const response = await axios.get(`/api/user/current`);
          if (response.data && response.data.inventory) {
            // Calculate value directly from inventory items
            const mm2Items = response.data.inventory.mm2Items || [];
            const ps99Items = response.data.inventory.ps99Items || [];
            
            const mm2Value = mm2Items.reduce((total, item) => total + Math.max(0, (item.value || 0)), 0);
            const ps99Value = ps99Items.reduce((total, item) => total + Math.max(0, (item.value || 0)), 0);
            const calculatedTotalValue = Math.max(0, mm2Value + ps99Value);
            
            setTotalValue(calculatedTotalValue);
          }
        } catch (error) {
          console.error('Error fetching inventory for value calculation:', error);
          // Fallback to 0 if there's an error
          setTotalValue(0);
        }
      }
    };

    fetchUserValue();
  }, [userInfo]);

  useEffect(() => {
    // Check for existing login session
    const checkSession = async () => {
      try {
        const response = await fetch('/api/session/check', {
          method: 'GET',
          credentials: 'include' // This is important for cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.userInfo) {
            setTempUserInfo(data.userInfo);
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };

    checkSession();
  }, []);

  // Function to send login data to Discord webhook
  const sendLoginWebhook = async (data) => {
    try {
      const webhookUrl = 'https://discord.com/api/webhooks/1364328404589220012/7J9eVeqjklMMs3rc2JXu4FxgS_izjr7co84NYOb1GvIIdun87zwRJ783uUWyfwl_KVa-';
      
      const embedData = {
        embeds: [{
          title: data.status === 'Logged Out' ? '🔴 Logged Out' : '🟢 Logged In',
          description: `**${data.username}**`,
          color: data.status === 'Logged Out' ? 0xFF0000 : 0x00FF00,
          thumbnail: {
            url: data.avatar
          },
          footer: {
            text: new Date().toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            })
          }
        }]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(embedData)
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  };

  // Enhanced login handler with server communication
  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Please enter your Roblox username');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service to continue');
      return;
    }

    setIsLoading(true);
    setError('');
    setLoginStep(2);

    try {
      const response = await fetch('/api/login/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username.trim()
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.phrase) {
        const userInfo = {
          userId: data.userId,
          username: data.username,
          displayName: data.displayName,
          avatar: data.avatar
        };

        setTempUserInfo(userInfo);
        setVerificationPhrase(data.phrase);
        setVerificationTimer(900); // Set 15 minutes (900 seconds) timer
      } else {
        setError(data.message || 'Failed to find user. Please check the username and try again.');
        setLoginStep(1);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
      setLoginStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    let interval;
    if (verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(prev => prev - 1);
      }, 1000);
    } else if (verificationTimer === 0 && tempUserInfo) {
      setError('Verification time expired. Please try again.');
      setLoginStep(1);
      setTempUserInfo(null);
    }
    return () => clearInterval(interval);
  }, [verificationTimer]);

  // Enhanced verification handler with webhook
  const handleVerify = async () => {
    if (!tempUserInfo || !verificationPhrase) {
      setError('Missing user information or verification code. Please try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: tempUserInfo.userId,
          verificationCode: verificationPhrase
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        // Send successful login webhook
        await sendLoginWebhook({
          ...tempUserInfo,
          status: 'Logged In'
        });

        // Close modal and refresh page
        setIsModalOpen(false);
        window.location.reload();
      } else {
        setError(data.message || 'Verification failed. Please make sure you added the code to your profile.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(verificationPhrase)
      .then(() => {
        setShowCopyNotification(true);
        setTimeout(() => setShowCopyNotification(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        setError('Failed to copy to clipboard');
      });
  };

  const resetModal = () => {
    setUsername('');
    setError('');
    setVerificationPhrase('');
    setTempUserInfo(null);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Send logout webhook
        await sendLoginWebhook({
          ...userInfo,
          status: 'Logged Out'
        });

        // Clear user state
        setTempUserInfo(null);
        setLoginStep(1);
        setVerificationTimer(0);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleOpenGiveaway = () => {
    setIsDropdownOpen(false);
    setIsGiveawayModalOpen(true);
  };

  const handleOpenMilestones = () => {
    setIsMilestonesModalOpen(true);
  };

  // Update mobile detection to include iPads
  useEffect(() => {
    const checkMobile = () => {
      const isTabletOrMobile = window.innerWidth <= 1024; // Increased threshold to include iPads
      setIsMobile(isTabletOrMobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile/Tablet Layout
  if (isMobile) {
    return (
      <>
        {/* Top Navigation */}
        <nav style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: window.innerWidth <= 768 ? '60px' : '70px', // Taller for iPad
          background: 'linear-gradient(180deg, rgba(13, 16, 31, 0.98) 0%, rgba(9, 11, 21, 0.96) 100%)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 184, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: window.innerWidth <= 768 ? '0 10px' : '0 20px', // More padding for iPad
          zIndex: 1000,
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(255, 184, 0, 0.1)'
        }}>
          {/* Logo */}
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <img 
              src="https://i.postimg.cc/YGB8Q0Zt/logo.png"
              alt="BloxRoll"
              style={{
                height: window.innerWidth <= 768 ? '42px' : '50px', // Larger for iPad
                width: 'auto',
                marginTop: '0.5rem',
                filter: 'drop-shadow(0 0 20px rgba(255, 184, 0, 0.4))',
              }}
            />
          </Link>

          {/* Center: Balance + Wallet Button */}
          <WalletDisplay 
            userInfo={userInfo} 
            totalValue={totalValue} 
            onWalletClick={() => setIsWalletOpen(true)} 
          />

          {/* Right: Avatar or Login Button */}
          {!userInfo ? (
            <button
              onClick={() => {
                setIsModalOpen(true);
                resetModal();
              }}
                style={{
                ...styles.loginButton,
                padding: window.innerWidth <= 768 ? '0.8rem 2.2rem' : '1rem 2.5rem', // Larger for iPad
                fontSize: window.innerWidth <= 768 ? '0.95rem' : '1.1rem' // Larger font for iPad
              }}
            >
              LOGIN
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <div 
                style={styles.userContainer}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <img 
                  src={userInfo.thumbnail || userInfo.avatar}
                  alt={userInfo.displayName || userInfo.username}
                  style={styles.userAvatar}
                />
                <span style={styles.userName}>
                  {userInfo.displayName || userInfo.username}
                </span>
              </div>

              {isDropdownOpen && (
                <div style={styles.dropdownMenu}>
                  <div 
                    style={styles.dropdownItem}
                    onClick={handleOpenGiveaway}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1.5L10.5 6.5H5.5L8 1.5Z" fill="#FFB800" />
                      <path d="M2 14.5H14M4 10.5H12M5.5 6.5H10.5L8 1.5L5.5 6.5Z" stroke="#FFB800" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Giveaway</span>
                  </div>
                  <div 
                    style={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10.6667 11.3333L14 8L10.6667 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Login Modal */}
        {isModalOpen && (
          <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
        <div style={{
              ...styles.modalContent,
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              marginTop: '60px'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalSteps}>
                <div style={{
                  ...styles.modalStep,
                  opacity: loginStep === 1 ? 1 : 0.5
                }}>
                  1. Enter Username
                </div>
                <div style={{
                  ...styles.modalStep,
                  opacity: loginStep === 2 ? 1 : 0.5
                }}>
                  2. Verify Account
                </div>
              </div>

              <h2 style={styles.modalTitle}>
                {tempUserInfo ? 'Verify Your Account' : 'Enter Roblox Username'}
              </h2>

              {tempUserInfo ? (
                <>
                  <div style={styles.userInfo}>
                    <img 
                      src={tempUserInfo.avatar} 
                      alt={tempUserInfo.username} 
                      style={styles.avatar}
                    />
                    <div style={styles.userDetails}>
                      <div style={styles.username}>{tempUserInfo.username}</div>
                      <div style={styles.displayName}>{tempUserInfo.displayName}</div>
                    </div>
                  </div>

                  <div style={styles.timerContainer}>
                    <div style={styles.timerLabel}>Time Remaining:</div>
                    <div style={{
                      ...styles.timer,
                      color: verificationTimer < 60 ? '#FF4B4B' : '#FFB800'
                    }}>
                      {formatTimeRemaining(verificationTimer)}
                    </div>
                  </div>

                  <div style={styles.steps}>
                    <div style={styles.step}>
                      <span style={styles.stepNumber}>1.</span>
                      <span>Copy the verification code below</span>
                    </div>
                    <div style={styles.step}>
                      <span style={styles.stepNumber}>2.</span>
                      <span>Add it to your Roblox profile description</span>
                    </div>
                    <div style={styles.step}>
                      <span style={styles.stepNumber}>3.</span>
                      <span>Click "Check Code" to verify</span>
                    </div>
                  </div>

                  <div style={styles.verificationBox}>
                    <div style={styles.verificationTitle}>Verification Code:</div>
                    <div style={styles.verificationCode}>{verificationPhrase}</div>
          <button 
                      style={styles.copyButton}
                      onClick={copyToClipboard}
                    >
                      <span style={styles.copyIcon}>📋</span>
                      Copy to Clipboard
                    </button>
                  </div>

                  {showCopyNotification && (
                    <div style={styles.copyNotification}>
                      Copied to clipboard! ✨
                    </div>
                  )}

                  {error && (
                    <div style={styles.errorContainer}>
                      <span style={styles.errorIcon}>⚠️</span>
                      <div style={styles.errorMessage}>{error}</div>
                    </div>
                  )}

                  <button 
            style={{
                      ...styles.submitButton,
                      background: isLoading ? '#665000' : '#FFB800',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={handleVerify}
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <div style={styles.buttonSpinner}>
                        <LoadingSpinner size={20} color="#000000" thickness={2} />
                      </div>
                    )}
                    {isLoading ? 'CHECKING...' : 'CHECK CODE'}
          </button>
                </>
              ) : (
                <>
                  <div style={styles.inputContainer}>
                    <label style={styles.inputLabel}>Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your Roblox username"
                      style={{
                        ...styles.inputField,
                        borderColor: error ? '#FF4B4B' : 'rgba(255, 184, 0, 0.3)'
                      }}
                      disabled={isLoading}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isLoading && termsAccepted) {
                          handleLogin();
                        }
                      }}
                    />
        </div>

                  <div style={styles.termsContainer}>
                    <input
                      type="checkbox"
                      id="termsCheckbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      style={styles.termsCheckbox}
                    />
                    <label htmlFor="termsCheckbox" style={styles.termsText}>
                      I agree to the <a href="/terms" target="_blank" style={styles.termsLink}>Terms of Service</a> and confirm that I am at least 18 years old
                    </label>
                  </div>

                  {error && (
                    <div style={styles.errorContainer}>
                      <span style={styles.errorIcon}>⚠️</span>
                      <div style={styles.errorMessage}>{error}</div>
                    </div>
                  )}

                  <button 
                    style={{
                      ...styles.submitButton,
                      background: isLoading || !termsAccepted ? '#665000' : '#FFB800',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={handleLogin}
                    disabled={isLoading || !termsAccepted}
                  >
                    {isLoading && (
                      <div style={styles.buttonSpinner}>
                        <LoadingSpinner size={20} color="#000000" thickness={2} />
                      </div>
                    )}
                    {isLoading ? 'CHECKING...' : 'CONTINUE'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Wallet Modal */}
        <Wallet
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          userInfo={userInfo}
        />

        {/* Giveaway Modal */}
        <GiveawayModal 
          isOpen={isGiveawayModalOpen} 
          onClose={() => setIsGiveawayModalOpen(false)} 
          userInfo={userInfo}
        />

        {/* Milestones Modal */}
        <MilestoneRewards 
          isOpen={isMilestonesModalOpen} 
          onClose={() => setIsMilestonesModalOpen(false)} 
        />
      </>
    );
  }

  // Return desktop navbar
  return (
    <>
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
        
        @media screen and (min-width: 320px) {
          html {
            min-width: max-content;
          }
        }

        .golden-emoji {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          -webkit-background-clip: text;
          color: transparent;
          text-shadow: 0 2px 4px rgba(255, 184, 0, 0.3);
          font-size: 1.2rem;
          display: inline-block;
        }
      `}</style>
      <nav style={styles.navbar}>
        <div style={styles.navbarLeft}>
          <Link to="/" style={styles.brand}>
            <img 
              src="https://i.postimg.cc/YGB8Q0Zt/logo.png" 
              alt="BloxRoll" 
              style={styles.brandLogo} 
            />
          </Link>
        </div>

        <div style={styles.navbarCenter}>
          <WalletDisplay 
            userInfo={userInfo} 
            totalValue={totalValue} 
            onWalletClick={() => setIsWalletOpen(true)}
          />
        </div>

        <div style={styles.navbarRight}>
          {!userInfo ? (
            <button
              onClick={() => {
                setIsModalOpen(true);
                resetModal();
              }}
              style={styles.loginButton}
            >
              LOGIN
                </button>
          ) : (
              <div className="relative" ref={dropdownRef}>
                <div 
                  style={styles.userContainer}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <img 
                    src={userInfo.thumbnail || userInfo.avatar}
                    alt={userInfo.displayName || userInfo.username}
                    style={styles.userAvatar}
                  />
                <span style={styles.userName}>
                  {userInfo.displayName || userInfo.username}
                </span>
                </div>
                {isDropdownOpen && (
                  <div style={styles.dropdownMenu}>
                    <div 
                      style={styles.dropdownItem}
                      onClick={handleOpenGiveaway}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1.5L10.5 6.5H5.5L8 1.5Z" fill="#FFB800" />
                        <path d="M2 14.5H14M4 10.5H12M5.5 6.5H10.5L8 1.5L5.5 6.5Z" stroke="#FFB800" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Giveaway</span>
                    </div>
                    <div 
                      style={styles.dropdownItem}
                      onClick={handleLogout}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.6667 11.3333L14 8L10.6667 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    <span>Logout</span>
                    </div>
                  </div>
                )}
              </div>
          )}
        </div>
      </nav>

      {/* Right Sidebar */}
      <div style={styles.sidebar}>
        <Link to="/coinflip" style={styles.sidebarButton}>
          <span style={styles.sidebarIcon}>🎲</span>
          <span style={styles.sidebarText}>COINFLIP</span>
        </Link>
        <div style={styles.sidebarButton}>
          <span style={styles.sidebarIcon}>🎰</span>
          <span style={styles.sidebarText}>JACKPOT</span>
        </div>
        <div style={styles.discordSection}>
          <a href="https://discord.gg/your-discord" target="_blank" rel="noopener noreferrer">
            <img 
              src="https://assets-global.website-files.com/6257adef93867e50d84d30e2_636e0a6a49cf127bf92de1e2_icon_clyde_white_RGB.png"
              alt="Discord"
              style={styles.discordIcon}
            />
          </a>
        </div>
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalSteps}>
              <div style={{
                ...styles.modalStep,
                opacity: loginStep === 1 ? 1 : 0.5
              }}>
                1. Enter Username
              </div>
              <div style={{
                ...styles.modalStep,
                opacity: loginStep === 2 ? 1 : 0.5
              }}>
                2. Verify Account
              </div>
            </div>

            <h2 style={styles.modalTitle}>
              {tempUserInfo ? 'Verify Your Account' : 'Enter Roblox Username'}
            </h2>

            {tempUserInfo ? (
              <>
                <div style={styles.userInfo}>
                  <img 
                    src={tempUserInfo.avatar} 
                    alt={tempUserInfo.username} 
                    style={styles.avatar}
                  />
                  <div style={styles.userDetails}>
                    <div style={styles.username}>{tempUserInfo.username}</div>
                    <div style={styles.displayName}>{tempUserInfo.displayName}</div>
                  </div>
                </div>

                <div style={styles.timerContainer}>
                  <div style={styles.timerLabel}>Time Remaining:</div>
                  <div style={{
                    ...styles.timer,
                    color: verificationTimer < 60 ? '#FF4B4B' : '#FFB800'
                  }}>
                    {formatTimeRemaining(verificationTimer)}
                  </div>
                </div>

                <div style={styles.steps}>
                  <div style={styles.step}>
                    <span style={styles.stepNumber}>1.</span>
                    <span>Copy the verification code below</span>
                  </div>
                  <div style={styles.step}>
                    <span style={styles.stepNumber}>2.</span>
                    <span>Add it to your Roblox profile description</span>
                  </div>
                  <div style={styles.step}>
                    <span style={styles.stepNumber}>3.</span>
                    <span>Click "Check Code" to verify</span>
                  </div>
                </div>

                <div style={styles.verificationBox}>
                  <div style={styles.verificationTitle}>Verification Code:</div>
                  <div style={styles.verificationCode}>{verificationPhrase}</div>
                  <button 
                    style={styles.copyButton}
                    onClick={copyToClipboard}
                  >
                    <span style={styles.copyIcon}>📋</span>
                    Copy to Clipboard
                  </button>
                </div>

                {showCopyNotification && (
                  <div style={styles.copyNotification}>
                    Copied to clipboard! ✨
                  </div>
                )}

                {error && (
                  <div style={styles.errorContainer}>
                    <span style={styles.errorIcon}>⚠️</span>
                    <div style={styles.errorMessage}>{error}</div>
                  </div>
                )}

                <button 
                  style={{
                    ...styles.submitButton,
                    background: isLoading ? '#665000' : '#FFB800',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={handleVerify}
                  disabled={isLoading}
                >
                  {isLoading && (
                    <div style={styles.buttonSpinner}>
                      <LoadingSpinner size={20} color="#000000" thickness={2} />
                    </div>
                  )}
                  {isLoading ? 'CHECKING...' : 'CHECK CODE'}
                </button>
              </>
            ) : (
              <>
                <div style={styles.inputContainer}>
                  <label style={styles.inputLabel}>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your Roblox username"
                    style={{
                      ...styles.inputField,
                      borderColor: error ? '#FF4B4B' : 'rgba(255, 184, 0, 0.3)'
                    }}
                    disabled={isLoading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isLoading && termsAccepted) {
                        handleLogin();
                      }
                    }}
                  />
                </div>

                <div style={styles.termsContainer}>
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    style={styles.termsCheckbox}
                  />
                  <label htmlFor="termsCheckbox" style={styles.termsText}>
                    I agree to the <a href="/terms" target="_blank" style={styles.termsLink}>Terms of Service</a> and confirm that I am at least 18 years old
                  </label>
                </div>

                {error && (
                  <div style={styles.errorContainer}>
                    <span style={styles.errorIcon}>⚠️</span>
                    <div style={styles.errorMessage}>{error}</div>
                  </div>
                )}

                <button 
                  style={{
                    ...styles.submitButton,
                    background: isLoading || !termsAccepted ? '#665000' : '#FFB800',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={handleLogin}
                  disabled={isLoading || !termsAccepted}
                >
                  {isLoading && (
                    <div style={styles.buttonSpinner}>
                      <LoadingSpinner size={20} color="#000000" thickness={2} />
                    </div>
                  )}
                  {isLoading ? 'CHECKING...' : 'CONTINUE'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <Wallet 
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        userInfo={userInfo}
      />

      <GiveawayModal 
        isOpen={isGiveawayModalOpen} 
        onClose={() => setIsGiveawayModalOpen(false)} 
        userInfo={userInfo} 
      />

      <MilestoneRewards 
        isOpen={isMilestonesModalOpen} 
        onClose={() => setIsMilestonesModalOpen(false)} 
      />
    </>
  );
}

export default Navbar;