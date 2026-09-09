import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { PublicLedger } from './pages/PublicLedger';
import { ParcelDetail } from './pages/ParcelDetail';
import { ProvenanceExplorer } from './pages/ProvenanceExplorer';

export const App: React.FC = () => {
  return (
    <Web3Provider>
      <Router>
        <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 border-r border-border bg-card shadow-sm z-20">
            <Navbar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <main className="p-8 max-w-[1600px] mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/public-ledger" element={<PublicLedger />} />
                <Route path="/parcel/:id" element={<ParcelDetail />} />
                <Route path="/provenance" element={<ProvenanceExplorer />} />
              </Routes>
            </main>
          </div>

        </div>
      </Router>
    </Web3Provider>
  );
};

export default App;
