import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreatePoll from './pages/CreatePoll';
import ViewPoll from './pages/ViewPoll';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>🚀 Apollo Poll</h1>
          <p>Real-Time Polling Made Simple</p>
        </header>
        <Routes>
          <Route path="/" element={<CreatePoll />} />
          <Route path="/poll/:pollId" element={<ViewPoll />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
