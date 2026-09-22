import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Maximize2, ShieldCheck, Tag, ExternalLink, Hash, Clock, FileCheck, AlertTriangle } from 'lucide-react';

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
  status: 'pending_verification' | 'verified' | 'listed_for_sale' | 'transfer_pending' | 'transferred' | 'rejected' | 'disputed';
  created_at: string;
}

interface LandCardProps {
  record: LandRecord;
  onActionClick?: (record: LandRecord) => void;
  actionText?: string;
}

export const LandCard: React.FC<LandCardProps> = ({ record, onActionClick, actionText }) => {
  const statusBadges: Record<string, { label: string; style: string; icon: any }> = {
    pending_verification: { label: 'Verification Pending', style: 'bg-warning/10 text-warning border-warning/30', icon: Clock },
    verified: { label: 'Govt Verified', style: 'bg-success/10 text-success border-success/30', icon: ShieldCheck },
    listed_for_sale: { label: 'For Sale', style: 'bg-primary/10 text-primary border-primary/30', icon: Tag },
    transfer_pending: { label: 'Transfer Escrow Pending', style: 'bg-accent/10 text-accent border-accent/30', icon: Clock },
    transferred: { label: 'Transferred', style: 'bg-primary/10 text-primary border-primary/30', icon: FileCheck },
    rejected: { label: 'Rejected', style: 'bg-destructive/10 text-destructive border-destructive/30', icon: Clock },
    disputed: { label: 'Title Disputed', style: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertTriangle },
  };

  const badge = statusBadges[record.status] || statusBadges.pending_verification;
  const BadgeIcon = badge.icon;

  const truncate = (str: string, len: number = 10) => `${str.slice(0, len)}...${str.slice(-4)}`;

  return (
    <>
      {/* Top Header & Status */}
      <div className="p-5 flex-1 flex flex-col space-y-4 bg-card">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-primary" />
            {record.cadastral_id}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.style}`}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </span>
        </div>

        <div>
          <h3 className="font-heading text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug">
            {record.title}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            {record.city ? `${record.city}, ` : ''}{record.district}, {record.state}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-border">
          <div className="bg-background/50 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Total Area</span>
            <span className="font-heading text-sm font-extrabold text-foreground flex items-center gap-1 mt-0.5">
              <Maximize2 className="w-3.5 h-3.5 text-primary" />
              {record.area_sqft.toLocaleString()} sq.ft
            </span>
          </div>
          <div className="bg-background/50 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Listed Valuation</span>
            <span className="font-heading text-sm font-extrabold text-primary mt-0.5 block">
              {record.price_eth} ETH
            </span>
          </div>
        </div>

        {/* Owner & Document Hash */}
        <div className="space-y-1.5 text-xs font-medium">
          <div className="flex justify-between text-muted-foreground">
            <span className="text-muted-foreground">Current Owner:</span>
            <span className="font-mono text-foreground font-bold">{truncate(record.owner_address, 6)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span className="text-muted-foreground">SHA-256 Proof:</span>
            <span className="font-mono text-primary text-[11px] font-bold">{truncate(record.document_hash, 8)}</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between gap-3 mt-auto">
        <Link
          to={`/parcel/${record.id}`}
          className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          View Details <ExternalLink className="w-3 h-3" />
        </Link>

        {onActionClick && actionText && (
          <button
            onClick={() => onActionClick(record)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg transition-all shadow-sm"
          >
            {actionText}
          </button>
        )}
      </div>
    </>
  );
};
