import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Maximize2, ShieldCheck, Tag, ExternalLink, Hash, Clock, FileCheck } from 'lucide-react';

export interface LandRecord {
  id: string;
  onchain_id?: number;
  cadastral_id: string;
  title: string;
  description?: string;
  state: string;
  district: string;
  city?: string;
  pincode?: string;
  area_sqft: number;
  price_eth: number;
  price_wei?: string;
  coordinates_lat?: number;
  coordinates_lng?: number;
  owner_address: string;
  document_url?: string;
  document_hash: string;
  status: 'pending_verification' | 'verified' | 'listed_for_sale' | 'transfer_pending' | 'transferred' | 'rejected';
  created_at: string;
}

interface LandCardProps {
  record: LandRecord;
  onActionClick?: (record: LandRecord) => void;
  actionText?: string;
}

export const LandCard: React.FC<LandCardProps> = ({ record, onActionClick, actionText }) => {
  const statusBadges: Record<string, { label: string; style: string; icon: any }> = {
    pending_verification: { label: 'Verification Pending', style: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock },
    verified: { label: 'Govt Verified', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: ShieldCheck },
    listed_for_sale: { label: 'For Sale', style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', icon: Tag },
    transfer_pending: { label: 'Transfer Escrow Pending', style: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Clock },
    transferred: { label: 'Transferred', style: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: FileCheck },
    rejected: { label: 'Rejected', style: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: Clock },
  };

  const badge = statusBadges[record.status] || statusBadges.pending_verification;
  const BadgeIcon = badge.icon;

  const truncate = (str: string, len: number = 10) => `${str.slice(0, len)}...${str.slice(-4)}`;

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group">
      
      {/* Top Header & Status */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-emerald-400" />
            {record.cadastral_id}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.style}`}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </span>
        </div>

        <div>
          <h3 className="font-heading text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
            {record.title}
          </h3>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            {record.city ? `${record.city}, ` : ''}{record.district}, {record.state}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80">
          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Total Area</span>
            <span className="font-heading text-sm font-bold text-slate-200 flex items-center gap-1 mt-0.5">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              {record.area_sqft.toLocaleString()} sq.ft
            </span>
          </div>
          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Listed Valuation</span>
            <span className="font-heading text-sm font-bold text-emerald-400 mt-0.5 block">
              {record.price_eth} ETH
            </span>
          </div>
        </div>

        {/* Owner & Document Hash */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span className="text-slate-500">Current Owner:</span>
            <span className="font-mono text-slate-300">{truncate(record.owner_address, 6)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span className="text-slate-500">SHA-256 Proof:</span>
            <span className="font-mono text-emerald-400 text-[11px]">{truncate(record.document_hash, 8)}</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <Link
          to={`/parcel/${record.id}`}
          className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
        >
          View Details <ExternalLink className="w-3 h-3" />
        </Link>

        {onActionClick && actionText && (
          <button
            onClick={() => onActionClick(record)}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/10"
          >
            {actionText}
          </button>
        )}
      </div>

    </div>
  );
};
