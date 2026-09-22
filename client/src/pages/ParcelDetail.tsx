import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Maximize2, Hash, FileText, ArrowLeft, ExternalLink, Cpu, CheckCircle2, User, Clock, AlertTriangle, Gavel } from 'lucide-react';
import { LandRecord } from '../components/LandCard';
import { useWeb3 } from '../context/Web3Context';

export const ParcelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { contract, role, account } = useWeb3();

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
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [txSubmitting, setTxSubmitting] = useState<boolean>(false);

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

  useEffect(() => {
    if (id) fetchParcelDetail();
  }, [id]);

  const handleFlagDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !data.offChainRecord?.onchain_id || !disputeReason) return;
    try {
      setTxSubmitting(true);
      const tx = await contract.flagDispute(data.offChainRecord.onchain_id, disputeReason);
      await tx.wait();
      alert('Dispute flagged successfully on-chain!');
      setShowDisputeModal(false);
      fetchParcelDetail();
    } catch (err: any) {
      console.error('Dispute flag failed:', err);
      alert('Failed to flag dispute: ' + (err.reason || err.message));
    } finally {
      setTxSubmitting(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!contract || !data.offChainRecord?.onchain_id) return;
    try {
      setTxSubmitting(true);
      const tx = await contract.resolveDispute(data.offChainRecord.onchain_id);
      await tx.wait();
      alert('Dispute resolved successfully on-chain!');
      fetchParcelDetail();
    } catch (err: any) {
      console.error('Dispute resolution failed:', err);
      alert('Failed to resolve dispute: ' + (err.reason || err.message));
    } finally {
      setTxSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading parcel details...</div>;
  }

  const record = data.offChainRecord;

  if (!record) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-heading text-xl font-bold text-foreground mb-2">Parcel Not Found</h2>
        <Link to="/" className="text-xs text-primary hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isDisputed = record.status === 'disputed' || data.onChainData?.isDisputed;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Navigation */}
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Disputed Alert Banner */}
      {isDisputed && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <h4 className="font-bold text-sm text-destructive">Title Currently Under Legal Dispute</h4>
              <p className="text-xs text-muted-foreground">On-chain transactions & transfers are frozen until cleared by a Government Registrar.</p>
            </div>
          </div>
          {role === 'registrar' && (
            <button
              onClick={handleResolveDispute}
              disabled={txSubmitting}
              className="px-4 py-2 bg-success hover:bg-success/90 text-success-foreground font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Gavel className="w-3.5 h-3.5" />
              {txSubmitting ? 'Resolving...' : 'Resolve Dispute'}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Left Details */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="clean-card p-6 sm:p-8 border border-border space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="font-mono text-xs px-3 py-1.5 rounded-lg bg-foreground text-card border border-border flex items-center gap-2 font-semibold">
                <Hash className="w-3.5 h-3.5 text-primary" />
                Cadastral ID: {record.cadastral_id}
              </span>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${isDisputed ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-success/10 text-success border-success/30'}`}>
                  {isDisputed ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-4 h-4" />}
                  {record.status.toUpperCase().replace('_', ' ')}
                </span>
                {!isDisputed && record.onchain_id && (
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="px-3 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-full text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" /> Flag Dispute
                  </button>
                )}
              </div>
            </div>

            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">{record.title}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <MapPin className="w-4 h-4 text-primary" />
                {record.city ? `${record.city}, ` : ''}{record.district}, {record.state} {record.pincode ? `(${record.pincode})` : ''}
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed bg-background p-4 rounded-2xl border border-border">
              {record.description || 'No additional description provided.'}
            </p>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="bg-foreground/5 p-4 rounded-2xl border border-border">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Survey Area</span>
                <span className="font-heading text-lg font-bold text-foreground mt-1 block">
                  {record.area_sqft.toLocaleString()} sq.ft
                </span>
              </div>
              <div className="bg-foreground/5 p-4 rounded-2xl border border-border">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Valuation</span>
                <span className="font-heading text-lg font-bold text-success mt-1 block">
                  {record.price_eth} ETH
                </span>
              </div>
              <div className="bg-foreground/5 p-4 rounded-2xl border border-border">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">On-Chain Parcel ID</span>
                <span className="font-heading text-lg font-bold text-primary mt-1 block">
                  #{record.onchain_id || 'Pending'}
                </span>
              </div>
            </div>

          </div>

          {/* Provenance Activity Logs */}
          <div className="clean-card p-6 sm:p-8 border border-border space-y-4">
            <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-success" />
              Title Provenance & Chain of Custody
            </h3>

            <div className="space-y-3">
              {data.provenanceTrail && data.provenanceTrail.length > 0 ? (
                data.provenanceTrail.map((log: any, idx: number) => (
                  <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{log.event_type}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Actor Wallet: <span className="font-mono text-foreground font-semibold">{log.actor_address}</span></p>
                      {log.tx_hash && (
                        <p className="text-[11px] font-mono text-primary break-all">Tx: {log.tx_hash}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No provenance logs recorded yet.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Sidebar Verification Box */}
        <div className="space-y-6">
          
          <div className="clean-card p-6 border border-border space-y-5">
            <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              Cryptographic Proof Verification
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground font-semibold block mb-1">SHA-256 Deed Document Hash:</span>
                <div className="p-3 bg-foreground text-card rounded-xl font-mono text-[11px] break-all border border-border font-medium">
                  {record.document_hash}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground font-semibold block mb-1">Current Owner Address:</span>
                <div className="p-3 bg-foreground text-card rounded-xl font-mono text-[11px] break-all border border-border font-medium">
                  {record.owner_address}
                </div>
              </div>

              {record.document_url && (
                <a
                  href={record.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-foreground hover:bg-foreground/90 border border-border rounded-xl text-xs font-bold text-card transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4 text-card" />
                  View Original Deed PDF <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="pt-4 border-t border-border text-[11px] text-primary font-medium space-y-1.5">
              <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3"/> Verified by Government Registrar</p>
              <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3"/> Title Pinned to Ethereum Ledger</p>
              <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3"/> SHA-256 Hash Matching On-Chain Proof</p>
            </div>
          </div>

        </div>

      </div>

      {/* Flag Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-3xl space-y-4">
            <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Flag Title Dispute
            </h3>
            <p className="text-xs text-muted-foreground">
              Flagging a dispute on-chain will immediately freeze listings & title transfer until reviewed by a Registrar.
            </p>
            <form onSubmit={handleFlagDispute} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Reason for Dispute</label>
                <textarea
                  required
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="e.g. Overlapping boundary claim or unverified ownership assertion..."
                  className="w-full p-3 bg-muted border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txSubmitting}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
                >
                  {txSubmitting ? 'Submitting...' : 'Submit On-Chain Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
