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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <Database className="w-4 h-4" />
          Public On-Chain Title Ledger
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-white">Immutable Land Registry Ledger</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Search land title records, inspect SHA-256 deed hashes, and verify cadastral boundaries across government jurisdictions.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by cadastral ID, property title, city or owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-4 py-2.5 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All States</option>
            <option value="California">California</option>
            <option value="New York">New York</option>
            <option value="Texas">Texas</option>
            <option value="Florida">Florida</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-4 py-2.5 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="listed_for_sale">Listed for Sale</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="transferred">Transferred</option>
          </select>

          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all"
          >
            Filter
          </button>
        </div>

      </form>

      {/* Grid Results */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading public ledger...</div>
      ) : records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.map(record => (
            <LandCard key={record.id} record={record} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 text-slate-400">
          No records match the selected filter criteria.
        </div>
      )}

    </div>
  );
};
