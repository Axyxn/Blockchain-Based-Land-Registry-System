import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Maximize2, Hash, FileText, ArrowLeft, ExternalLink, Cpu, CheckCircle2, User, Clock } from 'lucide-react';
import { LandRecord } from '../components/LandCard';

export const ParcelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<{
    offChainRecord: LandRecord | null;
    onChainData: any;
    provenanceTrail: any[];
  }>({
    offChainRecord: null,
    onChainData: null,
    provenanceTrail: []
  });

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchParcelDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/land/${id}`);
        if (res.ok) {
          const detailData = await res.json();
          setData(detailData);
        }
      } catch (err) {
        console.error('Error fetching parcel detail:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchParcelDetail();
  }, [id]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading parcel details...</div>;
  }

  const record = data.offChainRecord;

  if (!record) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-heading text-xl font-bold text-white mb-2">Parcel Not Found</h2>
        <Link to="/" className="text-xs text-emerald-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Navigation */}
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Left Details */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="font-mono text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                Cadastral ID: {record.cadastral_id}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                {record.status.toUpperCase().replace('_', ' ')}
              </span>
            </div>

            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">{record.title}</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {record.city ? `${record.city}, ` : ''}{record.district}, {record.state} {record.pincode ? `(${record.pincode})` : ''}
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
              {record.description || 'No additional description provided.'}
            </p>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Survey Area</span>
                <span className="font-heading text-lg font-bold text-slate-200 mt-1 block">
                  {record.area_sqft.toLocaleString()} sq.ft
                </span>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Valuation</span>
                <span className="font-heading text-lg font-bold text-emerald-400 mt-1 block">
                  {record.price_eth} ETH
                </span>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">On-Chain Parcel ID</span>
                <span className="font-heading text-lg font-bold text-cyan-400 mt-1 block">
                  #{record.onchain_id || 'Pending'}
                </span>
              </div>
            </div>

          </div>

          {/* Provenance Activity Logs */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Title Provenance & Chain of Custody
            </h3>

            <div className="space-y-3">
              {data.provenanceTrail && data.provenanceTrail.length > 0 ? (
                data.provenanceTrail.map((log: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{log.event_type}</span>
                        <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-400">Actor Wallet: <span className="font-mono text-slate-300">{log.actor_address}</span></p>
                      {log.tx_hash && (
                        <p className="text-[11px] font-mono text-emerald-400 break-all">Tx: {log.tx_hash}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No provenance logs recorded yet.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Sidebar Verification Box */}
        <div className="space-y-6">
          
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
            <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Cryptographic Proof Verification
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">SHA-256 Deed Document Hash:</span>
                <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-emerald-400 break-all border border-slate-850">
                  {record.document_hash}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Current Owner Address:</span>
                <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-slate-300 break-all border border-slate-850">
                  {record.owner_address}
                </div>
              </div>

              {record.document_url && (
                <a
                  href={record.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  View Original Deed PDF <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p>✔ Verified by Government Registrar</p>
              <p>✔ Title Pinned to Ethereum Ledger</p>
              <p>✔ SHA-256 Hash Matching On-Chain Proof</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
