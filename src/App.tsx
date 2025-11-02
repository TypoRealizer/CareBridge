import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Header from './components/Header';
import HomePage from './components/HomePage';
import ResultsPage from './components/ResultsPage';
import HelpPage from './components/HelpPage';
import { Toaster } from './components/ui/sonner';

function App() {
  const [documentData, setDocumentData] = useState(null);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage setDocumentData={setDocumentData} />} />
          <Route path="/results" element={<ResultsPage documentData={documentData} />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}

export default App;
