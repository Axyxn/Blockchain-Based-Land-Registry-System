import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3, RoleType } from '../context/Web3Context';
import { Landmark, UserCheck, ChevronDown, CheckCircle2, Wallet, LayoutDashboard, Search, History, Settings, HelpCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { account, connectWallet, disconnectWallet, role, setRole, isConnecting } = useWeb3();
  const location = useLocation();

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const roleColors: Record<RoleType, string> = {
    registrar: 'text-warning bg-warning/10',
    owner: 'text-success bg-success/10',
    buyer: 'text-primary bg-primary/10',
  };

  return (
    <aside className="h-full flex flex-col bg-card border-r border-border text-sm font-medium">
      
      {/* Brand Logo */}
      <div className="p-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Landmark className="w-4 h-4" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            TerraChain
          </span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 space-y-1">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 mt-4 px-2">Menu</div>
        
        <Link
          to="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            location.pathname === '/'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
        <Link
          to="/public-ledger"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            location.pathname === '/public-ledger'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Search className="w-4 h-4" />
          Public Ledger
        </Link>
        <Link
          to="/provenance"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            location.pathname.startsWith('/provenance')
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <History className="w-4 h-4" />
          Provenance Trail
        </Link>

        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 mt-8 px-2">Preferences</div>
        <Link to="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <Link to="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
          <HelpCircle className="w-4 h-4" /> Help
        </Link>
      </nav>

      {/* Bottom Action Bar (Wallet & Role) */}
      <div className="p-4 border-t border-border space-y-4">
        
        {/* Demo Role Switcher */}
        <div className="relative group w-full">
          <button className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${roleColors[role]}`}>
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="capitalize">{role} View</span>
            </div>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          <div className="absolute bottom-full left-0 mb-2 w-full py-2 bg-card rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto border border-border z-50">
            <div className="px-3 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Switch Mode</div>
            <button
              onClick={() => setRole('registrar')}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted ${role === 'registrar' ? 'text-warning font-bold' : 'text-foreground'}`}
            >
              Registrar {role === 'registrar' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setRole('owner')}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted ${role === 'owner' ? 'text-success font-bold' : 'text-foreground'}`}
            >
              Land Owner {role === 'owner' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setRole('buyer')}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted ${role === 'buyer' ? 'text-primary font-bold' : 'text-foreground'}`}
            >
              Buyer {role === 'buyer' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Wallet Connect Button */}
        {account ? (
          <button
            onClick={disconnectWallet}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-all shadow-sm"
          >
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>{truncateAddress(account)}</span>
          </button>
        ) : (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Wallet className="w-4 h-4" />
            <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
          </button>
        )}
      </div>
    </aside>
  );
};
