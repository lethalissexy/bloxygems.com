import React from 'react';
import { formatValueCompact } from '../utils/formatters';

const MilestoneRewards = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const milestones = [
    {
      id: 1,
      title: "First to 50B Wager",
      description: "Be the first player to reach 50 billion in total wagers!",
      reward: "2,000,000,000 FREE",
      progress: null,
      icon: "💎",
      color: "#FFD700"
    },
    {
      id: 2,
      title: "First to 10B Profit",
      description: "Be the first player to achieve 10 billion in total profit!",
      reward: "1,500,000,000 FREE",
      progress: null,
      icon: "💎",
      color: "#00BFFF"
    }
  ];

  const joinDiscord = () => {
    window.open('https://discord.gg/KFAkgwkh', '_blank');
  };
  
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 16, 31, 0.85)',
      backdropFilter: 'blur(5px)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer'
    },
    modal: {
      background: 'linear-gradient(145deg, rgba(13, 16, 31, 0.98), rgba(18, 21, 40, 0.98))',
      borderRadius: '16px',
      border: '1px solid rgba(255, 184, 0, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      width: '90%',
      maxWidth: '800px',
      height: 'auto',
      maxHeight: '85vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'default'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      borderBottom: '1px solid rgba(255, 184, 0, 0.15)'
    },
    title: {
      color: '#FFB800',
      fontSize: '24px',
      fontWeight: 'bold',
      margin: 0,
      fontFamily: "'Chakra Petch', sans-serif"
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#fff',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '4px'
    },
    content: {
      padding: '24px',
      overflowY: 'auto',
      flex: 1
    },
    milestonesContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    milestoneCard: {
      background: 'rgba(26, 31, 49, 0.7)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'transform 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-4px)'
      }
    },
    milestoneHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px'
    },
    milestoneIcon: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      background: 'rgba(255, 184, 0, 0.1)',
      border: '1px solid rgba(255, 184, 0, 0.3)'
    },
    milestoneTitle: {
      color: '#FFB800',
      fontSize: '20px',
      fontWeight: 'bold',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    milestoneDescription: {
      color: '#B8C3E6',
      fontSize: '14px',
      marginBottom: '16px',
      lineHeight: 1.5
    },
    rewardContainer: {
      background: 'rgba(13, 16, 31, 0.6)',
      borderRadius: '8px',
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    rewardLabel: {
      color: '#8D98B3',
      fontSize: '14px',
      fontWeight: '500'
    },
    rewardValue: {
      color: '#00FF9D',
      fontSize: '18px',
      fontWeight: 'bold',
      fontFamily: "'Chakra Petch', sans-serif"
    },
    discordSection: {
      marginTop: '24px',
      background: 'rgba(88, 101, 242, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid rgba(88, 101, 242, 0.3)'
    },
    discordHeader: {
      color: '#5865F2',
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    discordLogo: {
      fontSize: '20px'
    },
    discordText: {
      color: '#B8C3E6',
      fontSize: '14px',
      marginBottom: '16px',
      lineHeight: 1.5
    },
    discordButton: {
      background: '#5865F2',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'background-color 0.2s ease',
      '&:hover': {
        background: '#4752C4'
      }
    }
  };
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Milestone Rewards</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div style={styles.content}>
          <div style={styles.milestonesContainer}>
            {milestones.map(milestone => (
              <div 
                key={milestone.id} 
                style={{
                  ...styles.milestoneCard,
                  boxShadow: `0 4px 20px rgba(${milestone.color === '#FFD700' ? '255, 215, 0' : '0, 191, 255'}, 0.1)`
                }}
              >
                <div style={styles.milestoneHeader}>
                  <div style={{
                    ...styles.milestoneIcon,
                    background: `linear-gradient(135deg, rgba(${milestone.color === '#FFD700' ? '255, 215, 0' : '0, 191, 255'}, 0.1), rgba(${milestone.color === '#FFD700' ? '255, 215, 0' : '0, 191, 255'}, 0.2))`,
                    border: `1px solid rgba(${milestone.color === '#FFD700' ? '255, 215, 0' : '0, 191, 255'}, 0.3)`
                  }}>
                    {milestone.icon}
                  </div>
                  <h3 style={styles.milestoneTitle}>{milestone.title}</h3>
                </div>
                <p style={styles.milestoneDescription}>{milestone.description}</p>
                <div style={styles.rewardContainer}>
                  <span style={styles.rewardLabel}>Reward:</span>
                  <span style={styles.rewardValue}>💎 {milestone.reward}</span>
                </div>
              </div>
            ))}
            
            <div style={styles.discordSection}>
              <h3 style={styles.discordHeader}>
                <span style={styles.discordLogo}>
                  <svg width="24" height="24" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#5865F2"/>
                  </svg>
                </span>
                Join our Discord
              </h3>
              <p style={styles.discordText}>
                Winners will be announced in our Discord community! Join to stay updated on who reaches these milestones first and to claim your rewards if you win.
              </p>
              <button style={styles.discordButton} onClick={joinDiscord}>
                <svg width="18" height="18" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                </svg>
                Join Discord Server
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneRewards; 