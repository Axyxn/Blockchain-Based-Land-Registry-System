import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, CheckCircle2, User, Clock, ArrowRight, Hash, ExternalLink, Search } from 'lucide-react';

export const ProvenanceExplorer: React.FC = () => {
  const [parcelId, setParcelId] = useState<string>('1');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchProvenance = async (idToFetch: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/land/${idToFetch}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.provenanceTrail || []);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error fetching provenance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvenance(parcelId);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (parcelId) fetchProvenance(parcelId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Layers className="w-4 h-4" />
          On-Chain Audit Trail & Custody Chain
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-white">Land Title Provenance Explorer</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Trace the complete historical chain of custody, title registrations, government verifications, and escrow transfers for any parcel.
        </p>
      </div>

      {/* Parcel Query Form */}
      <form onSubmit={handleSearch} className="glass-panel p-4 rounded-2xl border border-slate-800 flex gap-3 max-w-md">
        <div className="relative flex-1">
          <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Enter Parcel ID or Cadastral ID..."
            value={parcelId}
            onChange={e => setParcelId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" />
          Trace
        </button>
      </form>

      {/* Visual Timeline */}
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800 space-y-8">
        <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          Custody & Event Log Timeline for Parcel #{parcelId}
        </h3>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Tracing blockchain audit logs...</div>
        ) : logs.length > 0 ? (
          <div className="relative border-l-2 border-slate-800 ml-4 sm:ml-8 space-y-8 pl-6 sm:pl-10 py-2">
            {logs.map((event, idx) => (
              <div key={idx} className="relative group">
                
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 w-6 h-6 rounded-full bg-slate-950 border-2 border-emerald-500 flex items-center justify-center glow-emerald">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                {/* Log Event Card */}
                <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                      {event.event_type}
                    </span>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    <div>
                      <span className="text-slate-500 block">Actor Address:</span>
                      <span className="font-mono text-slate-300">{event.actor_address}</span>
                    </div>
                    {event.tx_hash && (
                      <div>
                        <span className="text-slate-500 block">Transaction Hash:</span>
                        <span className="font-mono text-cyan-400 break-all">{event.tx_hash}</span>
                      </div>
                    )}
                  </div>

                  {event.details && (
                    <div className="p-3 bg-slate-950/80 rounded-xl text-[11px] font-mono text-slate-400 border border-slate-850">
                      <span className="text-slate-500 font-sans block text-[10px] uppercase mb-1 font-semibold">Event Parameters:</span>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            No provenance timeline records found for Parcel #{parcelId}.
          </div>
        )}
      </div>

    </div>
  );
};
