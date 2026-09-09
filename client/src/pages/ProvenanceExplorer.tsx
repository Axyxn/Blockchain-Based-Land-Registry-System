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
    <div className="space-y-8 pb-10">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          On-Chain Audit Trail
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-foreground">Land Title Provenance Explorer</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Trace the complete historical chain of custody, title registrations, government verifications, and escrow transfers for any parcel.
        </p>
      </div>

      {/* Parcel Query Form */}
      <form onSubmit={handleSearch} className="clean-card p-4 border border-border flex gap-3 max-w-md">
        <div className="relative flex-1">
          <Hash className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Enter Parcel ID or Cadastral ID..."
            value={parcelId}
            onChange={e => setParcelId(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground shadow-sm placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-1.5"
        >
          <Search className="w-4 h-4" />
          Trace
        </button>
      </form>

      {/* Visual Timeline */}
      <div className="clean-card p-6 sm:p-10 border border-border space-y-8">
        <h3 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Custody & Event Log Timeline for Parcel #{parcelId}
        </h3>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground font-medium">Tracing blockchain audit logs...</div>
        ) : logs.length > 0 ? (
          <div className="relative border-l-2 border-border ml-4 sm:ml-8 space-y-8 pl-6 sm:pl-10 py-2">
            {logs.map((event, idx) => (
              <div key={idx} className="relative group">
                
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 w-6 h-6 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>

                {/* Log Event Card */}
                <div className="clean-card p-5 border border-border space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                      {event.event_type}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    <div>
                      <span className="text-muted-foreground block font-medium">Actor Address:</span>
                      <span className="font-mono text-foreground font-bold">{event.actor_address}</span>
                    </div>
                    {event.tx_hash && (
                      <div>
                        <span className="text-muted-foreground block font-medium">Transaction Hash:</span>
                        <span className="font-mono text-primary font-bold break-all">{event.tx_hash}</span>
                      </div>
                    )}
                  </div>

                  {event.details && (
                    <div className="p-4 bg-background/50 rounded-xl text-[11px] font-mono text-muted-foreground border border-border">
                      <span className="text-muted-foreground font-sans block text-[10px] uppercase mb-1 font-bold">Event Parameters:</span>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground font-medium border border-border border-dashed rounded-xl">
            No provenance timeline records found for Parcel #{parcelId}.
          </div>
        )}
      </div>

    </div>
  );
};
