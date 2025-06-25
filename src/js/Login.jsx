import React, { useState, useEffect } from 'react';
import { registerUser, checkVerification } from '../database/utils/robloxVerification';
import User from '../database/models/User';

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    background: '#0A0A0A',
    borderRadius: '20px',
    padding: '3rem 2.5rem',
    minWidth: '380px',
    boxShadow: '0 0 40px rgba(255,184,0,0.2)',
    color: 'white',
    textAlign: 'center',
    position: 'relative',
    fontFamily: "'Chakra Petch', sans-serif",
    border: '1px solid rgba(255,184,0,0.2)'
  },
  closeBtn: {
    position: 'absolute',
    top: '1.2rem',
    right: '1.2rem',
    background: 'transparent',
    border: 'none',
    color: '#FFB800',
    fontSize: '1.8rem',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    '&:hover': {
      transform: 'scale(1.1)'
    }
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '700',
    marginBottom: '2rem',
    color: '#FFB800',
    textShadow: '0 0 10px rgba(255,184,0,0.3)'
  },
  input: {
    width: '100%',
    padding: '1rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,184,0,0.3)',
    marginBottom: '1.5rem',
    fontSize: '1.1rem',
    fontFamily: "'Chakra Petch', sans-serif",
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    '&:focus': {
      outline: 'none',
      borderColor: '#FFB800',
      boxShadow: '0 0 10px rgba(255,184,0,0.2)'
    }
  },
  loginBtn: {
    background: 'linear-gradient(45deg, #FFB800, #FFD700)',
    color: '#000',
    border: 'none',
    padding: '1rem 3rem',
    borderRadius: '12px',
    fontSize: '1.2rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '1rem',
    fontFamily: "'Chakra Petch', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(255,184,0,0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(255,184,0,0.4)'
    }
  },
  verificationBox: {
    background: 'rgba(255,184,0,0.1)',
    border: '1px solid rgba(255,184,0,0.3)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginTop: '1.5rem',
    textAlign: 'left'
  },
  verificationTitle: {
    color: '#FFB800',
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  verificationText: {
    color: '#B8C3E6',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    marginBottom: '1rem'
  },
  verificationCode: {
    background: 'rgba(0,0,0,0.3)',
    padding: '0.8rem',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '1.1rem',
    color: '#FFB800',
    textAlign: 'center',
    marginBottom: '1rem',
    border: '1px solid rgba(255,184,0,0.2)'
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    marginTop: '1rem'
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    color: '#B8C3E6',
    fontSize: '0.9rem'
  },
  stepNumber: {
    background: '#FFB800',
    color: '#000',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: '700'
  },
  error: {
    color: '#FF4444',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
    textAlign: 'center'
  },
  success: {
    color: '#00FF88',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
    textAlign: 'center'
  },
  loading: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,184,0,0.3)',
    borderRadius: '50%',
    borderTopColor: '#FFB800',
    animation: 'spin 1s ease-in-out infinite'
  }
};

function Login({ onClose }) {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogin = async () => {
    if (!username) {
      setError('Please enter your Roblox username');
      return;
    }
    
    setError('');
    setIsVerifying(true);
    
    try {
      const registrationResult = await registerUser(username);
      if (registrationResult && registrationResult.code) {
        setCode(registrationResult.code);
        startVerificationCheck(registrationResult.robloxId);
      } else {
        setError('Invalid Roblox username or user already exists');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    }
    
    setIsVerifying(false);
  };

  const startVerificationCheck = async (robloxId) => {
    setIsChecking(true);
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts = 1 minute
    
    const checkInterval = setInterval(async () => {
      attempts++;
      const isVerified = await checkVerification(robloxId);
      
      if (isVerified) {
        clearInterval(checkInterval);
        setIsChecking(false);
        setSuccess('Verification successful! Welcome to BloxRoll!');
        
        // Refresh site for all users after successful verification
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        setIsChecking(false);
        setError('Verification timed out. Please try again.');
      }
    }, 2000); // Check every 2 seconds
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <button style={modalStyles.closeBtn} onClick={onClose}>&times;</button>
        <div style={modalStyles.title}>Enter Your Roblox Username</div>
        
        <input 
          style={modalStyles.input} 
          type="text" 
          placeholder="Enter your Roblox username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        
        <button 
          style={modalStyles.loginBtn}
          onClick={handleLogin}
          disabled={isVerifying || isChecking}
        >
          {isVerifying ? 'Verifying...' : isChecking ? 'Checking...' : 'Continue'}
        </button>

        {error && <div style={modalStyles.error}>{error}</div>}
        {success && <div style={modalStyles.success}>{success}</div>}

        {code && (
          <div style={modalStyles.verificationBox}>
            <div style={modalStyles.verificationTitle}>
              <span>🔑</span> Verification Code
            </div>
            <div style={modalStyles.verificationCode}>{code}</div>
            <div style={modalStyles.verificationText}>
              To verify your account, follow these steps:
            </div>
            <div style={modalStyles.steps}>
              <div style={modalStyles.step}>
                <div style={modalStyles.stepNumber}>1</div>
                Copy the verification code above
              </div>
              <div style={modalStyles.step}>
                <div style={modalStyles.stepNumber}>2</div>
                Go to your Roblox profile
              </div>
              <div style={modalStyles.step}>
                <div style={modalStyles.stepNumber}>3</div>
                Paste the code in your profile description
              </div>
              <div style={modalStyles.step}>
                <div style={modalStyles.stepNumber}>4</div>
                Save your profile changes
              </div>
            </div>
            {isChecking && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <div style={modalStyles.loading}></div>
                <div style={{ color: '#FFB800', marginTop: '0.5rem' }}>
                  Checking verification...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;