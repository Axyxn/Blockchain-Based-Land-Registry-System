import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3, RoleType } from '../context/Web3Context';
import { ShieldCheck, Wallet, Landmark, Layers, UserCheck, ChevronDown, CheckCircle2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { account, connectWallet, disconnectWallet, role, setRole, isConnecting, chainId } = useWeb3();
  const location = useLocation();

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const roleColors: Record<RoleType, string> = {
    registrar: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    owner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    buyer: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Landmark className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-heading text-xl font-bold tracking-tight text-white flex items-center gap-2">
                TerraChain
                <span className="px-2 py-0.5 text-[10px] font-medium tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  SEPOLIA
                </span>
              </span>
              <span className="text-xs text-slate-400 block -mt-1">Blockchain Land Registry</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === '/'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/public-ledger"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === '/public-ledger'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Public Ledger
            </Link>
            <Link
              to="/provenance"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname.startsWith('/provenance')
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Provenance Trail
            </Link>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            
            {/* Demo Role Switcher */}
            <div className="relative group">
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider ${roleColors[role]}`}>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Role: {role}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              <div className="absolute right-0 mt-2 w-48 py-2 glass-panel rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-slate-700">
                <div className="px-3 py-1 text-[11px] text-slate-400 font-medium uppercase tracking-wider">Switch View Mode</div>
                <button
                  onClick={() => setRole('registrar')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${role === 'registrar' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}
                >
                  Govt Registrar {role === 'registrar' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setRole('owner')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${role === 'owner' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}
                >
                  Land Owner / Seller {role === 'owner' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setRole('buyer')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${role === 'buyer' ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}
                >
                  Buyer / General Public {role === 'buyer' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Wallet Connect Button */}
            {account ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={disconnectWallet}
                  className="flex items-center gap-2.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-slate-200 transition-all shadow-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{truncateAddress(account)}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
