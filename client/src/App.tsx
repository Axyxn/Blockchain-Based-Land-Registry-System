import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Dashboard } from './pages/Dashboard';
import { PublicLedger } from './pages/PublicLedger';
import { ParcelDetail } from './pages/ParcelDetail';
import { ProvenanceExplorer } from './pages/ProvenanceExplorer';

export const App: React.FC = () => {
  return (
    <Web3Provider>
      <Router>
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/public-ledger" element={<PublicLedger />} />
              <Route path="/parcel/:id" element={<ParcelDetail />} />
              <Route path="/provenance" element={<ProvenanceExplorer />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </Web3Provider>
  );
};

export default App;
