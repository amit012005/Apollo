import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { getCombinedFingerprint, generateFingerprintSync, getDeviceId } from '../utils/fingerprint';
import '../App.css';

function ViewPoll() {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [socket, setSocket] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [fingerprint, setFingerprint] = useState(null);

  useEffect(() => {
    // Generate fingerprint on mount with timeout - set immediately so poll can load
    try {
      // Set fingerprint immediately using sync version (non-blocking)
      const syncFp = generateFingerprintSync() + '|' + getDeviceId();
      setFingerprint(syncFp);
      
      // Try to get better fingerprint asynchronously (non-blocking, doesn't delay poll loading)
      (async () => {
        try {
          const asyncFp = await Promise.race([
            getCombinedFingerprint(),
            new Promise((resolve) => setTimeout(() => resolve(syncFp), 2000)) // 2 second timeout
          ]);
          if (asyncFp && asyncFp !== syncFp) {
            setFingerprint(asyncFp);
          }
        } catch (e) {
          // Keep sync fingerprint if async fails
          console.warn('Async fingerprint failed, using sync version:', e);
        }
      })();
      } catch (error) {
        // Ultimate fallback - generate basic fingerprint
        console.error('Fingerprint generation error:', error);
        try {
          const fallbackFp = generateFingerprintSync() + '|' + getDeviceId();
          setFingerprint(fallbackFp);
        } catch (e) {
          // Last resort - use device ID only
          console.error('All fingerprint methods failed:', e);
          const deviceId = getDeviceId();
          setFingerprint(deviceId);
        }
      }
  }, []);

  // Initialize socket connection (runs once)
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Join poll room and set up listeners (runs when pollId changes)
  useEffect(() => {
    if (!socket || !socket.connected) return;

    // Only join if not already in the room
    let hasJoined = false;
    
    const joinPoll = () => {
      if (!hasJoined && socket.connected) {
        socket.emit('join-poll', pollId);
        hasJoined = true;
      }
    };

    // Join immediately if connected, otherwise wait for connection
    if (socket.connected) {
      joinPoll();
    } else {
      socket.once('connect', joinPoll);
    }

    const handlePollUpdate = (updatedPoll) => {
      if (updatedPoll.pollId === pollId) {
        setPoll(updatedPoll);
      }
    };

    const handleViewerCount = (data) => {
      if (data.pollId === pollId) {
        setViewerCount(data.count);
      }
    };

    socket.on('poll-updated', handlePollUpdate);
    socket.on('viewer-count', handleViewerCount);

    return () => {
      hasJoined = false;
      if (socket.connected) {
        socket.emit('leave-poll', pollId);
      }
      socket.off('poll-updated', handlePollUpdate);
      socket.off('viewer-count', handleViewerCount);
      socket.off('connect', joinPoll);
    };
  }, [socket, pollId]);

  // Fetch poll data (runs when fingerprint is ready or after timeout)
  useEffect(() => {
    let timeoutId;
    
    const fetchPoll = async (fp) => {
      try {
        setLoading(true);
        const checkUrl = fp 
          ? `/api/votes/check/${pollId}?fingerprint=${fp}`
          : `/api/votes/check/${pollId}`;
        
        const [pollResponse, voteCheckResponse] = await Promise.all([
          axios.get(`/api/polls/${pollId}`),
          axios.get(checkUrl, { withCredentials: true })
        ]);

        if (pollResponse.data.success) {
          setPoll(pollResponse.data.poll);
          
          if (voteCheckResponse.data.hasVoted) {
            setHasVoted(true);
            setSelectedOption(voteCheckResponse.data.optionIndex);
          }
        } else {
          setError('Poll not found');
        }
      } catch (err) {
        console.error('Error fetching poll:', err);
        setError(err.response?.data?.error || 'Failed to load poll');
      } finally {
        setLoading(false);
      }
    };

    // If fingerprint is ready, fetch immediately
    if (fingerprint) {
      fetchPoll(fingerprint);
    } else {
      // Set a timeout - if fingerprint doesn't load in 1 second, fetch without it
      timeoutId = setTimeout(() => {
        console.warn('Fingerprint not ready, loading poll without it');
        fetchPoll(null);
      }, 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pollId, fingerprint]);

  const handleVote = async (optionIndex) => {
    if (hasVoted || voting || !fingerprint) {
      if (!fingerprint) {
        setError('Please wait while we verify your device...');
      }
      return;
    }

    setVoting(true);
    setError('');

    try {
      const response = await axios.post(
        '/api/votes',
        { pollId, optionIndex, fingerprint },
        { withCredentials: true }
      );

      if (response.data.success) {
        setHasVoted(true);
        setSelectedOption(optionIndex);
        setPoll(response.data.poll);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to vote';
      setError(errorMsg);
      
      // If user already voted, update state
      if (err.response?.data?.alreadyVoted) {
        setHasVoted(true);
        setSelectedOption(err.response.data.previousOptionIndex);
      }
    } finally {
      setVoting(false);
    }
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/poll/${pollId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getPercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const shareUrl = `${window.location.origin}/poll/${pollId}`;
  const shareText = encodeURIComponent(`Check out this poll: ${poll?.question}`);
  
  const socialLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading poll</div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/')}
          style={{ width: '100%', marginTop: '20px' }}
        >
          Go Back Home
        </button>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  // Find the winning option
  const maxVotes = Math.max(...poll.options.map(opt => opt.votes));
  const winningOptions = poll.options.filter(opt => opt.votes === maxVotes && maxVotes > 0);

  return (
    <div className="container fade-in">
      <h1 className="poll-question">{poll.question}</h1>

      {/* Poll Metadata */}
      <div className="poll-meta">
        <div className="meta-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Created {formatDate(poll.createdAt)}</span>
        </div>
        <div className="viewer-count">
          <div className="pulse-dot"></div>
          <span>{viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'} {isConnected ? 'online' : ''}</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {hasVoted && (
        <div className="success-message">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>You have voted! Results update in real-time.</span>
        </div>
      )}

      {/* Poll Options */}
      <div>
        {poll.options.map((option, index) => {
          const percentage = getPercentage(option.votes, poll.totalVotes);
          const isSelected = selectedOption === index;
          const isWinning = winningOptions.some(opt => opt.text === option.text) && poll.totalVotes > 0;

          return (
            <button
              key={index}
              className={`option-button ${isSelected ? 'selected' : ''} ${isWinning ? 'winning' : ''}`}
              onClick={() => handleVote(index)}
              disabled={hasVoted || voting}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="vote-bar" style={{ width: `${percentage}%` }}></div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="option-text">
                  {option.text}
                  {isWinning && poll.totalVotes > 0 && (
                    <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#10b981' }}>
                      🏆 Leading
                    </span>
                  )}
                </div>
                <div className="option-votes">
                  {option.votes} vote{option.votes !== 1 ? 's' : ''} • {percentage}%
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Statistics */}
      {poll.totalVotes > 0 && (
        <div className="poll-stats">
          <div className="stat-card">
            <div className="stat-value">{poll.totalVotes}</div>
            <div className="stat-label">Total Votes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{poll.options.length}</div>
            <div className="stat-label">Options</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(poll.totalVotes / poll.options.length)}</div>
            <div className="stat-label">Avg per Option</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{winningOptions.length === 1 ? '1' : `${winningOptions.length}`}</div>
            <div className="stat-label">{winningOptions.length === 1 ? 'Winner' : 'Tied'}</div>
          </div>
        </div>
      )}

      <div className="total-votes">
        <strong>Total Votes: {poll.totalVotes}</strong>
        {poll.totalVotes === 0 && <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#64748b' }}>Be the first to vote!</p>}
      </div>

      {/* Share Section */}
      <div className="share-section">
        <h3>Share this poll</h3>
        <div className="share-link">
          <input
            type="text"
            value={shareUrl}
            readOnly
            onClick={(e) => e.target.select()}
          />
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={copyToClipboard}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
        
        <div className="social-share">
          <a
            href={socialLinks.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="social-btn twitter"
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
            </svg>
            Twitter
          </a>
          <a
            href={socialLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="social-btn facebook"
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
            </svg>
            Facebook
          </a>
          <a
            href={socialLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="social-btn whatsapp"
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      </div>

      <button
        className="btn btn-secondary"
        onClick={() => navigate('/')}
        style={{ width: '100%', marginTop: '20px' }}
      >
        Create New Poll
      </button>
    </div>
  );
}

export default ViewPoll;
