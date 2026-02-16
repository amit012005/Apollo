import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function CreatePoll() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!question.trim()) {
      setError('Please enter a question');
      setLoading(false);
      return;
    }

    if (question.trim().length < 5) {
      setError('Question must be at least 5 characters long');
      setLoading(false);
      return;
    }

    const validOptions = options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setError('Please provide at least 2 options');
      setLoading(false);
      return;
    }

    // Check for duplicate options
    const uniqueOptions = new Set(validOptions.map(opt => opt.trim().toLowerCase()));
    if (uniqueOptions.size !== validOptions.length) {
      setError('Options must be unique');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/polls', {
        question: question.trim(),
        options: validOptions
      });

      if (response.data.success) {
        navigate(`/poll/${response.data.poll.pollId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create poll. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container fade-in">
      <h2 style={{ 
        marginBottom: '40px', 
        textAlign: 'center', 
        color: '#1a202c',
        fontSize: '2rem',
        fontWeight: 800,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Create a New Poll
      </h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="question">
            <svg width="20" height="20" style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Poll Question
          </label>
          <input
            id="question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What's your favorite programming language?"
            required
            maxLength={200}
          />
          <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#64748b' }}>
            {question.length}/200 characters
          </div>
        </div>

        <div className="form-group">
          <label>
            <svg width="20" height="20" style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Options (at least 2 required, max 10)
          </label>
          {options.map((option, index) => (
            <div key={index} className="option-item" style={{ animationDelay: `${index * 0.05}s` }}>
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  aria-label="Remove option"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              type="button"
              className="add-option-btn"
              onClick={handleAddOption}
            >
              <svg width="18" height="18" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Option ({options.length}/10)
            </button>
          )}
          {options.length >= 10 && (
            <div style={{ marginTop: '10px', padding: '12px', background: '#fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '0.9rem' }}>
              Maximum of 10 options reached
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !question.trim() || options.filter(opt => opt.trim()).length < 2}
          style={{ width: '100%', marginTop: '30px', fontSize: '1.1rem', padding: '18px' }}
        >
          {loading ? (
            <>
              <svg style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Creating Poll...
            </>
          ) : (
            <>
              <svg style={{ display: 'inline', marginRight: '8px' }} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Create Poll
            </>
          )}
        </button>
      </form>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f0f4ff', borderRadius: '12px', border: '2px solid #c7d2fe' }}>
        <h3 style={{ marginBottom: '12px', color: '#1a202c', fontSize: '1.1rem' }}>💡 Tips</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#4a5568', lineHeight: '1.8' }}>
          <li>Keep your question clear and concise</li>
          <li>Make options distinct and easy to choose from</li>
          <li>Share your poll link to get more votes</li>
          <li>Results update in real-time for all viewers</li>
        </ul>
      </div>
    </div>
  );
}

export default CreatePoll;
