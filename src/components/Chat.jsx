import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatTimeAgo, formatValueCompact } from '../utils/formatters';
import TipModal from './TipModal';
import GiveawayModal from './GiveawayModal';
import toast from 'react-hot-toast';
import MobileChat from './MobileChat';
import ProfileModal from './ProfileModal';

// Sample messages for initial loading state
const sampleMessages = [];

// Socket.io connection
let socket;

const styles = {
  chatContainer: {
    position: 'fixed',
    top: '80px',
    right: '0',
    width: '300px',
    height: 'calc(100vh - 80px)',
    background: '#1E2328',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100
  },
  chatHeader: {
    padding: '15px',
    background: '#1E2328',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  chatTitle: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  messageCount: {
    background: '#00FF9D',
    color: '#000',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  onlineUsers: {
    color: '#8D98B3',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  onlineDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#00FF9D',
    marginRight: '2px'
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  messageRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer'
  },
  messageContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  username: {
    color: '#FFB800',
    fontSize: '13px',
    fontWeight: '600'
  },
  message: {
    color: '#fff',
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  chatInput: {
    padding: '15px',
    background: '#1E2328',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    gap: '10px'
  },
  input: {
    flex: 1,
    background: '#282D34',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '14px'
  },
  sendButton: {
    background: '#FFB800',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  loginMessage: {
    background: 'rgba(255, 184, 0, 0.1)',
    border: '1px solid rgba(255, 184, 0, 0.2)',
    color: '#FFB800',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '14px',
    textAlign: 'center'
  },
  giveawayButton: {
    width: '100%',
    background: '#282D34',
    color: '#FFB800',
    border: '1px solid rgba(255, 184, 0, 0.2)',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  giveawayCount: {
    background: '#000',
    color: '#FFB800',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cooldownOverlay: {
    position: 'absolute',
    bottom: '60px',
    left: '10px',
    right: '10px',
    background: 'rgba(14, 17, 27, 0.95)',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    border: '1px solid rgba(255, 184, 0, 0.3)',
    backdropFilter: 'blur(4px)',
  },
  cooldownProgress: {
    flex: 1,
    height: '4px',
    background: 'rgba(255, 184, 0, 0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
    position: 'relative',
  },
  cooldownBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: 'linear-gradient(90deg, #FFB800, #FF9500)',
    borderRadius: '2px',
    transition: 'width 0.1s linear',
  },
  cooldownText: {
    color: '#FFB800',
    fontSize: '12px',
    fontWeight: '600',
    minWidth: '50px',
    textAlign: 'right',
  },
  // Profile modal styles
  profileModal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '320px',
    background: 'linear-gradient(135deg, rgba(18, 21, 32, 0.98) 0%, rgba(13, 16, 27, 0.98) 100%)',
    border: '1px solid rgba(255, 184, 0, 0.15)',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  profileHeader: {
    background: 'linear-gradient(90deg, rgba(22, 26, 40, 0.95) 0%, rgba(16, 19, 31, 0.95) 100%)',
    padding: '15px 20px',
    borderBottom: '1px solid rgba(255, 184, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileTitle: {
    color: '#FFB800',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    fontFamily: "'Chakra Petch', sans-serif",
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#B8C3E6',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '0',
  },
  profileContent: {
    padding: '20px',
  },
  profileUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px',
    padding: '0 5px',
  },
  profileAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(255, 184, 0, 0.5)',
    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)',
  },
  profileUsername: {
    color: '#FFB800',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '2px',
    fontFamily: "'Chakra Petch', sans-serif",
  },
  profileDisplayName: {
    color: '#8D98B3',
    fontSize: '14px',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  statItem: {
    background: 'rgba(14, 17, 27, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '12px 15px',
    textAlign: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    },
  },
  statValue: {
    color: '#FFB800',
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '5px',
    fontFamily: "'Chakra Petch', sans-serif",
  },
  statLabel: {
    color: '#8D98B3',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  tipButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #FFB800 0%, #FF9500 100%)',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Chakra Petch', sans-serif",
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'linear-gradient(135deg, #FFCA40 0%, #FFAE40 100%)',
      transform: 'translateY(-2px)',
    },
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    position: 'relative',
    backgroundColor: '#0E111B',
    borderRadius: '8px',
    border: '1px solid rgba(255, 184, 0, 0.2)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: 'auto',
    zIndex: 1001,
  },
  loadingText: {
    color: '#8D98B3',
    textAlign: 'center',
    padding: '30px 0',
  },
  // Add specific colors for profits
  profitPositive: {
    color: '#00FF9D',
  },
  profitNegative: {
    color: '#FF4F4F',
  },
  // New styles for giveaway button and count
  giveawayContainer: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
    cursor: 'pointer',
    position: 'relative',
    gap: '8px',
  },
  giveawayCountBadge: {
    background: '#FFB800',
    color: '#000',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    border: '1px solid rgba(255, 184, 0, 0.5)',
    boxShadow: '0 0 5px rgba(255, 184, 0, 0.3)',
    opacity: props => props.count > 0 ? 1 : 0.5,
  },
  giveawayTabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 184, 0, 0.2)',
    marginBottom: '15px',
  },
  giveawayTab: {
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#8D98B3',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  giveawayTabActive: {
    color: '#FFB800',
    borderBottom: '2px solid #FFB800',
  },
  giveawayCountdown: {
    color: '#00FF9D',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  giveawayWinners: {
    color: '#4D9FFF', // Blue color for winners
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex', 
    alignItems: 'center',
    gap: '5px',
    marginTop: '8px',
  },
  giveawayList: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '900px', // Increased from 800px
    maxHeight: '85vh', // Increased from 80vh
    background: 'linear-gradient(135deg, rgba(18, 21, 32, 0.98) 0%, rgba(13, 16, 27, 0.98) 100%)',
    border: '1px solid rgba(255, 184, 0, 0.15)',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  giveawayContent: {
    padding: '20px',
    overflowY: 'auto',
    maxHeight: 'calc(85vh - 120px)', // Adjusted for tabs
  },
  giveawayItem: {
    background: 'rgba(14, 17, 27, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '12px 15px',
    marginBottom: '10px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
  },
  giveawayItemHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 184, 0, 0.2)',
  },
  joinButton: {
    background: 'linear-gradient(135deg, #FFB800 0%, #FF9500 100%)',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  giveawayCreator: {
    color: '#8D98B3',
    fontSize: '12px',
    marginBottom: '5px',
  },
  giveawayHeader: {
    background: 'linear-gradient(90deg, rgba(22, 26, 40, 0.95) 0%, rgba(16, 19, 31, 0.95) 100%)',
    padding: '15px 20px',
    borderBottom: '1px solid rgba(255, 184, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  giveawayTitle: {
    color: '#FFB800',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    fontFamily: "'Chakra Petch', sans-serif",
  },
};

// Filter function to remove profanity - only block extreme profanity
const filterProfanity = (text) => {
  const profanityList = [
    'nigga', 'nigger', 'faggot'  // Only keep extreme profanity
  ];
  
  let filteredText = text;
  profanityList.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filteredText = filteredText.replace(regex, '***');
  });
  
  return filteredText;
};

// Simplified message filtering - only block obvious spam/scam patterns
const filterMessage = (text) => {
  let filteredText = filterProfanity(text);
  
  // Only block obvious gambling/scam sites
  const blockedSites = [
    'harvester', 'harv3ster', 'h4rv3st3r', 'h@rv3st3r', 'h4rv3ster', 'h@rv3ster',
    'bankro', 'b4nkro', 'b@nkro', 'b4nkr0', 'b@nkr0', 'b4nkro', 'b@nkro',
    'bloxluck', 'bl0xluck', 'bl0xluck', 'bl0xluck', 'bl0xluck', 'bl0xluck',
    'bloxybet', 'bl0xybet', 'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t',
    'psxgems', 'psxg3ms', 'psxg3ms', 'psxg3ms', 'psxg3ms', 'psxg3ms',
    'bloxyspin', 'bl0xyspin', 'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n',
    'bloxy.bet', 'bl0xy.b3t', 'bl0xy.b3t', 'bl0xy.b3t', 'bl0xy.b3t', 'bl0xy.b3t',
    'harv3ster', 'h4rv3st3r', 'h@rv3st3r', 'h4rv3st3r', 'h@rv3st3r', 'h4rv3st3r',
    'b4nkro', 'b@nkro', 'b4nkr0', 'b@nkr0', 'b4nkr0', 'b@nkr0',
    'bl0xluck', 'bl0xluck', 'bl0xluck', 'bl0xluck', 'bl0xluck', 'bl0xluck',
    'bl0xybet', 'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t',
    'psxg3ms', 'psxg3ms', 'psxg3ms', 'psxg3ms', 'psxg3ms', 'psxg3ms',
    'bl0xyspin', 'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n',
    'harv3st3r', 'h4rv3st3r', 'h@rv3st3r', 'h4rv3st3r', 'h@rv3st3r', 'h4rv3st3r',
    'b4nkr0', 'b@nkr0', 'b4nkr0', 'b@nkr0', 'b4nkr0', 'b@nkr0',
    'bl0xluck', 'bl0xluck', 'bl0xluck', 'bl0xluck', 'bl0xluck', 'bl0xluck',
    'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t', 'bl0xyb3t',
    'psxg3ms', 'psxg3ms', 'psxg3ms', 'psxg3ms', 'psxg3ms', 'psxg3ms',
    'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n', 'bl0xysp1n'
  ];

  // Simple pattern matching for blocked sites
  blockedSites.forEach(site => {
    const regex = new RegExp(site, 'gi');
    filteredText = filteredText.replace(regex, '***[blocked site]***');
  });

  // Only block obvious spam patterns
  const spamPatterns = [
    /(.)\1{10,}/g,  // 10+ repeated characters
    /\b(?:free|cheap)\s+(?:robux|money)\b/gi, // Obvious scam phrases
  ];
  
  spamPatterns.forEach(pattern => {
    filteredText = filteredText.replace(pattern, '***');
  });
  
  return filteredText;
};

const Chat = ({ isMobile, isOpen, onGiveawayClick, onTipClick, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [userSession, setUserSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [giveawayCount, setGiveawayCount] = useState(0);
  const [showGiveawayModal, setShowGiveawayModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [giveaways, setGiveaways] = useState([]);
  const [endedGiveaways, setEndedGiveaways] = useState([]);
  const [showGiveawayList, setShowGiveawayList] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [giveawaysLoading, setGiveawaysLoading] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const messagesRef = useRef(null);
  const socketRef = useRef(null);
  const lastMessageRef = useRef(null);
  const cooldownInterval = useRef(null);
  const sessionCheckInterval = useRef(null);

  const handleJoinGiveaway = useCallback((giveawayId) => {
    if (!userSession) {
      setError('You must be logged in to join giveaways');
      return;
    }
    
    // Show joining state by updating the UI immediately
    setGiveaways(prevGiveaways => 
      prevGiveaways.map(giveaway => 
        giveaway._id === giveawayId 
          ? { ...giveaway, isJoining: true } 
          : giveaway
      )
    );
    
    axios.post(`/api/giveaways/${giveawayId}/join`)
      .then(response => {
        console.log('Joined giveaway:', response.data);
        
        // Update the giveaway in the list to show as joined
        setGiveaways(prevGiveaways => 
          prevGiveaways.map(giveaway => 
            giveaway._id === giveawayId 
              ? { 
                  ...giveaway, 
                  joined: true, 
                  isJoining: false,
                  participantCount: (giveaway.participantCount || 0) + 1 
                } 
              : giveaway
          )
        );
      })
      .catch(error => {
        console.error('Error joining giveaway:', error);
        
        // Check if the error is due to insufficient wager
        if (error.response?.data?.insufficientWager) {
          const currentWager = error.response.data.currentWager || 0;
          const formattedWager = formatValueCompact(currentWager);
          const errorMessage = `You need at least 400,000,000 wager to join giveaways. Your current wager: ${formattedWager}`;
          
          // Show a toast at the bottom of the screen
          toast.error(errorMessage, {
            duration: 5000,
            position: 'bottom-center',
            style: {
              background: '#1A1F35',
              color: '#fff',
              border: '1px solid rgba(255, 75, 75, 0.3)',
            },
          });
        } else {
          // Show the error message from the server or a default message
          const errorMessage = error.response?.data?.error || 'Failed to join giveaway';
          setError(errorMessage);
        }
        
        // Reset the joining state
        setGiveaways(prevGiveaways => 
          prevGiveaways.map(giveaway => 
            giveaway._id === giveawayId 
              ? { ...giveaway, isJoining: false } 
              : giveaway
          )
        );
      });
  }, [userSession]);

  const handleGiveawayClick = useCallback(() => {
    onGiveawayClick();
  }, [onGiveawayClick]);

  // First, update the formatTimeRemaining function for more precise countdown
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

  const closeProfileModal = () => {
    setShowProfile(false);
    setProfileUser(null);
  };

  // Format currency for display
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '$0';
    
    // Convert to number if it's a string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (numValue >= 1000000000) {
      return `$${(numValue / 1000000000).toFixed(2)}B`;
    } else if (numValue >= 1000000) {
      return `$${(numValue / 1000000).toFixed(2)}M`;
    } else if (numValue >= 1000) {
      return `$${(numValue / 1000).toFixed(2)}K`;
    } else {
      return `$${numValue}`;
    }
  };

  // Remove the style injection effect
  useEffect(() => {
    // No style injection - remove completely
  }, []);
  
  // Enhanced session check function
  const checkSession = async () => {
    try {
      const response = await axios.get('/api/session/check');
      if (response.data.userInfo) {
        setUserSession(response.data.userInfo);
        // If we get a session and socket exists, authenticate
        if (socketRef.current) {
          socketRef.current.emit('authenticate', { userId: response.data.userInfo.id });
        }
      } else {
        setUserSession(null);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking session:', error);
      setIsLoading(false);
    }
  };

  // Initial session check and periodic checks
  useEffect(() => {
    // Check immediately on mount
    checkSession();

    // Set up periodic checks every 30 seconds
    sessionCheckInterval.current = setInterval(checkSession, 30000);

    // Check when window regains focus
    const handleFocus = () => {
      checkSession();
    };
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Message debounce and cooldown helper
  const canSendMessage = useCallback((message) => {
    // Check for empty message
    if (!message.trim()) return false;
    
    // Check if in cooldown
    if (cooldown) return false;
    
    // Check for spamming same message
    if (messages.length > 0 && 
        messages[messages.length - 1].userId === userSession?.id && 
        messages[messages.length - 1].message === message.trim()) {
      setError('Please don\'t send the same message twice');
      return false;
    }
    
    return true;
  }, [cooldown, messages, userSession]);
  
  // Set up Socket.io with enhanced session handling
  useEffect(() => {
    // Fetch initial messages with HTTP (fallback)
    const fetchMessages = async () => {
      try {
        const response = await axios.get('/api/chat/messages');
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    fetchMessages();
    
    // Connect to Socket.IO
    const SOCKET_URL = '/';
    socketRef.current = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    
    // Socket connection events
    socketRef.current.on('connect', () => {
      console.log('Connected to chat server at', SOCKET_URL);
      // Check session on reconnect
      checkSession();
    });
    
    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from chat server');
      // Check session on disconnect
      checkSession();
    });

    socketRef.current.on('reconnect', () => {
      console.log('Reconnected to chat server');
      // Check session on reconnect
      checkSession();
    });
    
    // Listen for chat history
    socketRef.current.on('chat-history', (history) => {
      setMessages(history);
    });
    
    // Listen for new messages
    socketRef.current.on('new-message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });
    
    // Error handling
    socketRef.current.on('error', (error) => {
      setError(error.message);
      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000);
    });
    
    // Track online users
    socketRef.current.on('user_count_update', (data) => {
      if (data && typeof data.count === 'number') {
        setOnlineUsers(data.count);
      }
    });

    // Listen for active giveaway count updates
    socketRef.current.on('active_giveaway_count', (data) => {
      if (data && typeof data.count === 'number') {
        setGiveawayCount(data.count);
      }
    });

    // Request initial giveaway count
    socketRef.current.emit('get_giveaway_count');
    
    // Cleanup on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Enhanced cooldown handling
  const startCooldown = () => {
    setCooldown(true);
    setCooldownTime(3); // 3 second cooldown

    if (cooldownInterval.current) {
      clearInterval(cooldownInterval.current);
    }

    cooldownInterval.current = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 0.1) {
          clearInterval(cooldownInterval.current);
          setCooldown(false);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    if (!userSession) {
      setError('You must be logged in to chat');
      return;
    }
    if (cooldown) {
      setError('Please wait before sending another message');
      return;
    }
    
    // Add message
    setMessages(prev => [...prev, {
      id: Date.now(),
      username: userSession.username,
      avatar: userSession.avatar,
      message: newMessage.trim()
    }]);

    // Clear input and start cooldown
    setNewMessage('');
    setCooldown(true);
    setCooldownTime(3);

    // Start cooldown timer
    const timer = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setCooldown(false);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAvatarClick = (username) => {
    setProfileUser({ username });
    setShowProfile(true);
    setProfileLoading(true);
    // Simulate loading user data
    setTimeout(() => setProfileLoading(false), 1000);
  };

  const handleTipButtonClick = () => {
    setShowTipModal(true);
  };

  // Preload giveaways once on component mount
  useEffect(() => {
    const preloadGiveaways = async () => {
      try {
        const response = await axios.get('/api/giveaways');
        console.log('Preloaded giveaways:', response.data);
        
        if (response.data && Array.isArray(response.data.giveaways)) {
          // Sort giveaways by whether they're active or ended
          const now = new Date();
          const active = [];
          const ended = [];
          
          response.data.giveaways.forEach(giveaway => {
            const endTime = new Date(giveaway.endTime);
            if (endTime > now && !giveaway.isCompleted) {
              active.push(giveaway);
            } else {
              ended.push(giveaway);
            }
          });
          
          setGiveaways(active);
          setEndedGiveaways(ended);
        }
      } catch (error) {
        console.error('Error preloading giveaways:', error);
      }
    };
    
    preloadGiveaways();
  }, []);

  // Add socket listener for new giveaways and updates
  useEffect(() => {
    if (!socketRef.current) return;
    
    const onNewGiveaway = (giveaway) => {
      console.log('New giveaway created:', giveaway);
      setGiveaways(prev => {
        // If this giveaway already exists, update it
        const exists = prev.some(g => g._id === giveaway._id);
        if (exists) {
          return prev.map(g => g._id === giveaway._id ? giveaway : g);
        }
        // Otherwise, add it to the list
        return [giveaway, ...prev];
      });
    };
    
    const onGiveawayUpdate = (updatedGiveaway) => {
      console.log('Giveaway updated:', updatedGiveaway);
      setGiveaways(prev => 
        prev.map(g => g._id === updatedGiveaway._id ? updatedGiveaway : g)
      );
    };
    
    const onGiveawayEnded = (endedGiveaway) => {
      console.log('Giveaway ended:', endedGiveaway);
      setGiveaways(prev => 
        prev.map(g => g._id === endedGiveaway._id ? endedGiveaway : g)
      );
    };
    
    socketRef.current.on('new_giveaway', onNewGiveaway);
    socketRef.current.on('giveaway_update', onGiveawayUpdate);
    socketRef.current.on('giveaway_ended', onGiveawayEnded);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_giveaway', onNewGiveaway);
        socketRef.current.off('giveaway_update', onGiveawayUpdate);
        socketRef.current.off('giveaway_ended', onGiveawayEnded);
      }
    };
  }, []);

  // Replace the interval timer with a more efficient approach 
  useEffect(() => {
    // Store timeouts for each giveaway
    const giveawayTimeouts = {};
    
    // Function to set up timeouts for each giveaway
    const setupGiveawayEndTimeouts = () => {
      // Clear any existing timeouts first
      Object.values(giveawayTimeouts).forEach(timeout => clearTimeout(timeout));
      
      const now = new Date();
      
      // Set up timeouts for each active giveaway
      giveaways.forEach(giveaway => {
        const endTime = new Date(giveaway.endTime);
        const timeUntilEnd = endTime - now;
        
        if (timeUntilEnd > 0 && !giveaway.isCompleted) {
          // Set a timeout to handle when this giveaway ends
          giveawayTimeouts[giveaway._id] = setTimeout(() => {
            console.log(`Giveaway ${giveaway._id} has ended locally`);
            
            // Get the updated giveaway info from the server
            axios.get(`/api/giveaways/${giveaway._id}`)
              .then(response => {
                if (response.data && response.data.giveaway) {
                  // If completed, move to ended giveaways
                  if (response.data.giveaway.isCompleted) {
                    setEndedGiveaways(prev => [response.data.giveaway, ...prev]);
                  }
                }
              })
              .catch(err => console.error('Error fetching ended giveaway:', err));
            
            // Remove from active giveaways
            setGiveaways(prev => prev.filter(g => g._id !== giveaway._id));
            
            // Refresh giveaway count
            axios.get('/api/giveaways/count')
              .then(response => {
                if (response.data && typeof response.data.count === 'number') {
                  setGiveawayCount(response.data.count);
                }
              })
              .catch(err => console.error('Error getting giveaway count:', err));
          }, timeUntilEnd);
        }
      });
    };
    
    // Set up timeouts whenever giveaways change
    setupGiveawayEndTimeouts();
    
    // Update the UI each second for countdown displays without server requests
    const countdownInterval = setInterval(() => {
      // Force re-render to update countdowns
      setGiveaways(prev => [...prev]);
    }, 1000);
    
    // Clean up all timeouts and intervals on unmount
    return () => {
      clearInterval(countdownInterval);
      Object.values(giveawayTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [giveaways]);

  // Add mobile-specific styles
  const containerStyle = {
    ...(isMobile ? {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: '60px',
      width: '100%',
      height: 'calc(100% - 60px)',
      zIndex: 9999,
      background: '#0D101F',
      borderRight: 'none',
      display: isOpen ? 'flex' : 'none',
      flexDirection: 'column',
      overflow: 'hidden'
    } : {
      position: 'fixed',
      top: '80px',
      left: 0,
      width: '300px',
      height: 'calc(100vh - 80px)',
      background: 'rgba(14, 17, 27, 0.98)',
      boxShadow: '4px 0 15px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 900,
      borderRight: '2px solid rgba(255, 184, 0, 0.15)'
    })
  };

  // Update the chat messages container style for mobile
  const messagesContainerStyle = {
    ...styles.chatMessages,
    ...(isMobile && {
      flex: 1,
      height: 'auto',
      maxHeight: 'none',
      paddingBottom: '120px', // Extra space for input and giveaway button
    })
  };

  const handleTipClick = (username) => {
    console.log('Tip clicked for:', username);
  };

  useEffect(() => {
    // Mock data for demonstration
    setOnlineUsers(42);
    setGiveawayCount(3);
    setMessages([
      {
        id: 1,
        username: 'Player1',
        avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=1',
        message: 'Hello everyone!'
      },
      {
        id: 2,
        username: 'Player2',
        avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=2',
        message: 'Hi there! How are you?'
      }
    ]);
  }, []);

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <div style={styles.chatTitle}>
          MESSAGES
          <div style={styles.messageCount}>
              {messages.length}
              </div>
        </div>
            <div style={styles.onlineUsers}>
              <div style={styles.onlineDot}></div>
          {onlineUsers} online
        </div>
        </div>
        
      <div ref={messagesRef} style={styles.chatMessages}>
        {!userSession && (
            <div style={styles.loginMessage}>
              You must be logged in to chat
            </div>
          )}
          
          {messages.map((msg, index) => (
          <div key={msg.id || index} style={styles.messageRow}>
            <img 
              src={msg.avatar} 
              alt={msg.username} 
              style={styles.avatar} 
                onClick={() => handleAvatarClick(msg.username)}
            />
              <div style={styles.messageContent}>
                <span style={styles.username}>{msg.username}</span>
                <span style={styles.message}>{msg.message}</span>
              </div>
            </div>
          ))}
        </div>

      <div style={styles.chatInput}>
          <input
          style={styles.input}
            type="text"
            placeholder={cooldown ? `Wait ${cooldownTime.toFixed(1)}s...` : "Say something!"}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!userSession || cooldown}
          />
          <button
            style={{
              ...styles.sendButton,
            opacity: cooldown || !userSession ? 0.7 : 1,
            cursor: cooldown || !userSession ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSendMessage}
            disabled={!userSession || cooldown}
          >
            Send
          </button>
        </div>

      {giveawayCount > 0 && (
        <div style={{
          padding: '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: '#1E2328'
        }}>
          <button 
            style={styles.giveawayButton}
            onClick={handleGiveawayClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 12v-2h-1V5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v5H4v2h1v7h14v-7h1zm-3-7v5h-4V5h4zm-6 0v5H7V5h4zm-5 7v-2h12v2H6zm12 5H6v-3h12v3z"/>
            </svg>
            GIVEAWAYS
            <span style={styles.giveawayCount}>{giveawayCount}</span>
          </button>
        </div>
      )}
        
        {error && (
          <div style={{
            ...styles.loginMessage, 
            position: 'absolute',
          bottom: cooldown ? '120px' : '80px',
            left: '10px',
            right: '10px',
          margin: 0,
          fontSize: '12px',
          padding: '8px'
          }}>
            {error}
          </div>
        )}

      {showProfile && profileUser && (
        <ProfileModal
          isOpen={showProfile}
          onClose={closeProfileModal}
          user={profileUser}
          loading={profileLoading}
          onTipClick={handleTipClick}
        />
      )}
    </div>
  );
};

export default Chat; 