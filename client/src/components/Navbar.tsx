import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3, RoleType } from '../context/Web3Context';
import { Landmark, UserCheck, ChevronDown, CheckCircle2, Wallet, LayoutDashboard, Search, History, Settings, HelpCircle, Bell, Check } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { account, connectWallet, disconnectWallet, role, setRole, isConnecting } = useWeb3();
  const location = useLocation();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    if (!account) return;
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`/api/notifications?walletAddress=${account}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (e) {
        console.warn('Could not fetch notifications:', e);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [account]);

  const markAllRead = async () => {
    if (!account) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: account })
      });
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const roleColors: Record<RoleType, string> = {
    registrar: 'text-warning bg-warning/10',
    owner: 'text-success bg-success/10',
    buyer: 'text-primary bg-primary/10',
  };

  return (
    <aside className="h-full flex flex-col bg-card border-r border-border text-sm font-medium">
      
      {/* Brand Logo & Notification Bell */}
      <div className="p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Landmark className="w-4 h-4" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            TerraChain
          </span>
        </Link>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 p-3 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-bold text-xs">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary flex items-center gap-1 hover:underline">
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id || n.created_at} className={`p-2.5 rounded-lg text-xs border ${n.is_read ? 'bg-card border-border' : 'bg-primary/5 border-primary/20 font-medium'}`}>
                      <div className="font-semibold text-foreground">{n.title}</div>
                      <div className="text-muted-foreground mt-0.5 text-[11px]">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 space-y-1">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 mt-4 px-2">Menu</div>
        
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            location.pathname === '/dashboard'
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
          <div className="space-y-1.5">
            <button
              onClick={disconnectWallet}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-all shadow-sm"
              title="Click to disconnect wallet"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="font-mono font-bold text-xs">{truncateAddress(account)}</span>
              </div>
              <span className="text-[10px] uppercase font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded">
                Demo
              </span>
            </button>
          </div>
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
