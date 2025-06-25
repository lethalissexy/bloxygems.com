import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, NavLink, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Chat from './components/Chat';
import Wallet from './components/Wallet';
import TermsOfService from './components/TermsOfService';
import Coinflip from './pages/Coinflip';
import Announcements from './components/Announcements';
import MilestoneRewards from './components/MilestoneRewards';
import MobileChat from './components/MobileChat';
import GiveawayModal from './components/GiveawayModal';
import GiveawayListModal from './components/GiveawayListModal';
import axios from 'axios';
import toast from 'react-hot-toast';
import TipModal from './components/TipModal';
import { SocketProvider } from './contexts/SocketContext';
import DepositModal from './components/DepositModal';
import useDepositStore from './utils/depositHandler';

const styles = {
  app: {
    minHeight: '100vh',
    width: '100%',
    background: '#0D1117',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    padding: '0',
    boxSizing: 'border-box'
  },
  mainContainer: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    background: '#161B22',
    borderRadius: '24px',
    overflow: 'hidden',
    display: 'flex',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    margin: '0',
    padding: '0',
    boxSizing: 'border-box'
  },
  contentWrapper: {
    flex: '1 0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 'calc(100% - 260px)',
    padding: '0',
    position: 'relative',
    marginTop: '120px',
    marginLeft: '100px',
    boxSizing: 'border-box',
    background: 'transparent',
    zIndex: 1
  },
  chatContainer: {
    position: 'fixed',
    top: '80px',
    right: '0',
    width: '220px',
    height: 'calc(100vh - 80px)',
    background: '#1E2328',
    zIndex: 998,
    borderRadius: '0',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRight: 'none',
    borderTop: 'none'
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1800px',
    paddingTop: '0',
    paddingRight: '0',
    boxSizing: 'border-box',
    position: 'relative',
    background: 'transparent'
  },
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 1
  },
  welcomeBanner: {
    width: 'calc(100% - 40px)',
    minHeight: '280px',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    background: 'linear-gradient(135deg, #1a1f2c 0%, #161922 100%)',
    padding: '50px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    zIndex: 1,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    margin: '0 auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    '&:before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(45deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0) 100%)',
      zIndex: -1
    }
  },
  bannerContent: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '1200px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  bannerTitle: {
    fontSize: '24px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#94a3b8',
    fontFamily: "'Chakra Petch', sans-serif",
    letterSpacing: '0.5px'
  },
  bannerSubtitle: {
    fontSize: '48px',
    fontWeight: '700',
    marginBottom: '32px',
    color: '#FFFFFF',
    fontFamily: "'Chakra Petch', sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    letterSpacing: '-0.02em',
    lineHeight: '1.2'
  },
  bannerButtons: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px'
  },
  primaryButton: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Chakra Petch', sans-serif",
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)'
    }
  },
  secondaryButton: {
    background: 'rgba(22, 27, 34, 0.6)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Chakra Petch', sans-serif",
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#cbd5e1',
      transform: 'translateY(-2px)'
    }
  },
  gameSection: {
    width: '800px',
    maxWidth: '800px',
    marginTop: '40px',
    position: 'relative',
    zIndex: 1,
    padding: '0 20px',
    marginLeft: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  gameTabs: {
    display: 'flex',
    gap: '16px',
    background: 'rgba(22, 27, 34, 0.6)',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
  },
  gameTab: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Chakra Petch', sans-serif",
    transition: 'all 0.2s ease',
    color: '#94A3B8',
    background: 'transparent',
    border: 'none',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'relative',
    minWidth: '140px',
    justifyContent: 'center',
    '&:hover': {
      color: '#FFFFFF',
      background: 'rgba(255, 255, 255, 0.05)'
    }
  },
  activeTab: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important',
    color: '#FFFFFF !important',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
  },
  inactiveTab: {
    background: 'transparent',
    color: '#94A3B8'
  },
  comingSoon: {
    textAlign: 'center',
    padding: '32px',
    background: 'rgba(22, 27, 34, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#94A3B8',
    fontSize: '16px',
    fontFamily: "'Chakra Petch', sans-serif",
    letterSpacing: '0.5px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
    '&:before': {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'linear-gradient(45deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0) 100%)',
      borderRadius: '12px',
      zIndex: -1
    }
  },
  backgroundImage: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(180deg, rgba(13, 17, 23, 0.94) 0%, rgba(13, 17, 23, 0.95) 100%), url("https://wallpaperaccess.com/full/1388229.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    zIndex: 0,
    opacity: 0.45,
    pointerEvents: 'none',
    transform: 'translateZ(0)',
    WebkitTransform: 'translateZ(0)',
    willChange: 'transform',
    '@media (max-width: 768px)': {
      backgroundAttachment: 'scroll'
    }
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '1000px',
    marginTop: '20px',
    background: 'linear-gradient(135deg, #000066 0%, #000044 100%)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(0, 0, 204, 0.2)',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 12px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#4444ff',
    marginBottom: '4px',
    fontFamily: "'Chakra Petch', sans-serif",
  },
  statLabel: {
    fontSize: '12px',
    color: '#9999ff',
    fontFamily: "'Chakra Petch', sans-serif",
  }
};

const responsiveStyles = `
  @media screen and (min-width: 320px) {
    html {
      min-width: 320px;
    }
    
    body {
      min-width: 320px;
      overflow-x: hidden;
    }
    
    .app {
      min-width: 320px;
    }
    
    .content-wrapper {
      min-width: 320px;
      padding: 0;
      margin-top: 60px;
    }
    
    .main-content {
      min-width: 320px;
      padding: 0;
      overflow-x: hidden;
    }
  }

  @media (max-width: 1200px) {
    .main-content {
      padding: 0;
    }
    
    .welcome-banner, .games-container {
      margin-left: auto;
      margin-right: auto;
    }
  }

  @media (max-width: 768px) {
    .content-wrapper {
      padding: 0;
    }
    
    .welcome-banner {
      width: calc(100% - 32px) !important;
      margin: 20px 16px !important;
      padding: 24px !important;
    }
    
    .banner-title {
      font-size: 20px !important;
    }
    
    .banner-subtitle {
      font-size: 32px !important;
      justify-content: center !important;
    }
    
    .game-section {
      width: 100% !important;
      padding: 0 16px !important;
      margin: 20px 0 !important;
    }
    
    .game-tabs {
      overflow-x: auto;
      padding-bottom: 8px;
      justify-content: flex-start;
      gap: 16px;
    }
    
    .game-tab {
      white-space: nowrap;
    }
  }

  @media (hover: hover) {
    .banner-button:hover {
      background: #33AAFF;
      transform: translateY(-2px);
    }
    
    .game-card:hover {
      transform: translateY(-4px);
      border-color: rgba(255, 255, 255, 0.2);
    }
  }

  @media (hover: none) {
    .banner-button:active,
    .game-card:active {
      transform: scale(0.98);
    }
  }
`;

function HomePage({ onOpenMilestones }) {
  const [activeTab, setActiveTab] = useState('live');
  const openDepositModal = useDepositStore((state) => state.openDepositModal);
  const location = useLocation();

  return (
    <div style={styles.main}>
      <div style={styles.container}>
        <div style={styles.welcomeBanner}>
          <div style={styles.bannerContent}>
            <h2 style={styles.bannerTitle}>Welcome to the #1 BGSI gambling Website!</h2>
            <h1 style={styles.bannerSubtitle}>
              Join BloxyVault today... <span role="img" aria-label="dice">🎲</span>
            </h1>
            <div style={styles.bannerButtons}>
              <button 
                style={styles.primaryButton}
                onClick={openDepositModal}
              >
                <span>💰</span> Deposit Now
              </button>
              <button 
                style={styles.secondaryButton}
                onClick={onOpenMilestones}
              >
                <span>🏆</span> View Rewards
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileLayout({ userSession, isChatOpen, setIsChatOpen, setIsMilestonesOpen }) {
  const location = useLocation();
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1117',
      paddingTop: window.innerWidth <= 768 ? '60px' : '70px',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      overflow: 'hidden'
    }}>
      <Navbar 
        openMilestones={() => setIsMilestonesOpen(true)}
        userInfo={userSession}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
      />

      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: '100%',
        padding: '0 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
      <Routes>
        <Route path="/" element={
          <HomePage 
            onOpenMilestones={() => setIsMilestonesOpen(true)}
            isMobile={true}
            isPad={window.innerWidth > 768 && window.innerWidth <= 1024}
          />
        } />
        <Route path="/coinflip" element={
          <Coinflip 
            userInfo={userSession}
            isMobile={true}
            isPad={window.innerWidth > 768 && window.innerWidth <= 1024}
          />
        } />
      </Routes>
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: '#161B22',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 10px',
        zIndex: 10000
      }}>
        <Link to="/" style={{
          color: location.pathname === '/' ? '#0095FF' : '#8A8D96',
          textDecoration: 'none',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>🏠</span>
          HOME
        </Link>
        <Link to="/coinflip" style={{
          color: location.pathname === '/coinflip' ? '#0095FF' : '#8A8D96',
          textDecoration: 'none',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>🎲</span>
          GAMES
        </Link>
        <button onClick={() => setIsChatOpen(prev => !prev)} style={{
          background: 'none',
          border: 'none',
          color: isChatOpen ? '#0095FF' : '#8A8D96',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer'
        }}>
          <span>💬</span>
          CHAT
        </button>
      </div>

      {/* Mobile Chat Container */}
      <div style={{
        position: 'fixed',
        top: '60px',
        left: 0,
        right: 0,
        bottom: '60px',
        background: '#090B15',
        zIndex: 9999,
        display: isChatOpen ? 'block' : 'none'
      }}>
        <Chat 
          userInfo={userSession}
          onClose={() => setIsChatOpen(false)}
          isMobile={true}
          isOpen={isChatOpen}
        />
      </div>
    </div>
  );
}

function AppContent() {
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showGiveawayList, setShowGiveawayList] = useState(false);
  const [giveaways, setGiveaways] = useState([]);
  const [endedGiveaways, setEndedGiveaways] = useState([]);
  const [userSession, setUserSession] = useState(null);
  const [showGiveawayModal, setShowGiveawayModal] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const { isOpen, onClose } = useDepositStore();

  // Check session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('/api/session/check');
        if (response.data.userInfo) {
          setUserSession(response.data.userInfo);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    checkSession();
  }, []);

  // Load giveaways
  useEffect(() => {
    const loadGiveaways = async () => {
      try {
        const response = await axios.get('/api/giveaways');
        if (response.data && Array.isArray(response.data.giveaways)) {
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
        console.error('Error loading giveaways:', error);
      }
    };
    loadGiveaways();
  }, []);

  const handleJoinGiveaway = async (giveawayId) => {
    if (!userSession) {
      toast.error('You must be logged in to join giveaways', {
        duration: 3000,
        position: 'bottom-center',
      });
      return;
    }
    
    setGiveaways(prevGiveaways => 
      prevGiveaways.map(giveaway => 
        giveaway._id === giveawayId 
          ? { ...giveaway, isJoining: true } 
          : giveaway
      )
    );
    
    try {
      await axios.post(`/api/giveaways/${giveawayId}/join`);
      
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
    } catch (error) {
      if (error.response?.data?.insufficientWager) {
        const currentWager = error.response.data.currentWager || 0;
        toast.error(`You need at least 400,000,000 wager to join giveaways. Your current wager: ${currentWager}`, {
          duration: 5000,
          position: 'bottom-center',
        });
      } else {
        toast.error(error.response?.data?.error || 'Failed to join giveaway', {
          duration: 3000,
          position: 'bottom-center',
        });
      }
      
      setGiveaways(prevGiveaways => 
        prevGiveaways.map(giveaway => 
          giveaway._id === giveawayId 
            ? { ...giveaway, isJoining: false } 
            : giveaway
        )
      );
    }
  };

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = responsiveStyles;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Check if device is mobile
  useEffect(() => {
    const checkDevice = () => {
      const isTabletOrMobile = window.innerWidth <= 1024;
      setIsMobileOrTablet(isTabletOrMobile);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Handle chat toggle
  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleTipClick = (user) => {
    if (!isMobile) {
      setSelectedUser(user);
      setIsTipModalOpen(true);
    }
  };

  // Mobile/Tablet Layout
  if (isMobileOrTablet) {
    return (
      <MobileLayout 
        userSession={userSession}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        setIsMilestonesOpen={setIsMilestonesOpen}
      />
    );
  }

  // Desktop Layout
  return (
      <div style={{
        minHeight: '100vh',
      background: 'transparent',
      position: 'relative',
      zIndex: 1
    }}>
      <div style={styles.backgroundImage} />
        <Toaster 
          position="bottom-center"
          toastOptions={{
            duration: 3500,
            style: {
            background: '#111428',
              color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '20px',
            zIndex: 10000
          }
          }}
        />
        <SocketProvider>
        <Navbar 
          isWalletOpen={isWalletOpen} 
          setIsWalletOpen={setIsWalletOpen}
          openMilestones={() => setIsMilestonesOpen(true)}
            userInfo={userSession}
        />
        <div style={styles.contentWrapper}>
          <Announcements />
          <Routes>
            <Route path="/" element={<HomePage onOpenMilestones={() => setIsMilestonesOpen(true)} />} />
            <Route path="/terms" element={<TermsOfService />} />
              <Route path="/wallet" element={<Wallet userId="123" userInfo={userSession} />} />
              <Route path="/coinflip" element={<Coinflip userInfo={userSession} />} />
            <Route path="/chat" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <div style={styles.chatContainer}>
          <Chat 
            isMobile={false}
            isOpen={true}
            onGiveawayClick={() => setShowGiveawayList(true)}
              onTipClick={handleTipClick}
          />
        </div>
          <Wallet isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} userInfo={userSession} />
        <MilestoneRewards isOpen={isMilestonesOpen} onClose={() => setIsMilestonesOpen(false)} />
        <GiveawayListModal
          isOpen={showGiveawayList}
          onClose={() => setShowGiveawayList(false)}
          giveaways={giveaways}
          endedGiveaways={endedGiveaways}
          onJoinGiveaway={handleJoinGiveaway}
          userSession={userSession}
        />
        <GiveawayModal
          isOpen={showGiveawayModal}
          onClose={() => setShowGiveawayModal(false)}
          userInfo={userSession}
        />
          {!isMobile && (
            <TipModal
              isOpen={isTipModalOpen}
              onClose={() => setIsTipModalOpen(false)}
              recipient={selectedUser}
            />
          )}
        </SocketProvider>
        <DepositModal isOpen={isOpen} onClose={onClose} />
      </div>
  );
}

function App() {
  const { isOpen, onClose } = useDepositStore();

  return (
    <Router>
      <SocketProvider>
        <div style={styles.app}>
          <div style={styles.mainContainer}>
          <Toaster position="top-center" />
          <AppContent />
          <DepositModal isOpen={isOpen} onClose={onClose} />
          </div>
        </div>
      </SocketProvider>
    </Router>
  );
}

export default App;