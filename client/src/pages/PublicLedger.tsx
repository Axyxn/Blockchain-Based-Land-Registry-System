import React, { useState, useEffect } from 'react';
import { LandCard, LandRecord } from '../components/LandCard';
import { Search, Filter, Database, ShieldCheck, MapPin } from 'lucide-react';

export const PublicLedger: React.FC = () => {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [stateFilter, setStateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (stateFilter) params.append('state', stateFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/land/public-ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error('Ledger fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [stateFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLedger();
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <Database className="w-4 h-4" />
          Public On-Chain Title Ledger
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-foreground">Immutable Land Registry Ledger</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Search land title records, inspect SHA-256 deed hashes, and verify cadastral boundaries across government jurisdictions.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="clean-card p-4 border border-border flex flex-col md:flex-row gap-4">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by cadastral ID, property title, city or owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground shadow-sm placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="bg-background border border-border text-sm font-medium text-foreground rounded-xl px-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
          >
            <option value="">All States</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Delhi">Delhi</option>
            <option value="Telangana">Telangana</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-background border border-border text-sm font-medium text-foreground rounded-xl px-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="listed_for_sale">Listed for Sale</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="transferred">Transferred</option>
          </select>

          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-all"
          >
            Filter
          </button>
        </div>

      </form>

      {/* Grid Results */}
      {loading ? (
        <div className="py-20 text-center font-medium text-muted-foreground">Loading public ledger...</div>
      ) : records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {records.map(record => (
            <div key={record.id} className="clean-card clean-card-hover border border-border flex flex-col overflow-hidden">
              <LandCard record={record} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center clean-card border border-border border-dashed text-muted-foreground font-medium">
          No records match the selected filter criteria.
        </div>
      )}

    </div>
  );
};
