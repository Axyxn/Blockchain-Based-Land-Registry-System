import React from 'react';
import { Landmark, Shield, Database, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-850 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Landmark className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-heading text-lg font-bold text-white">TerraChain</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decentralized Land Registry & On-Chain Title Management System. Powered by Solidity smart contracts, Supabase off-chain storage, and Render infrastructure.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">Architecture</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ethereum Sepolia / Polygon</span>
              </li>
              <li className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Supabase PostgreSQL + RLS</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>SHA-256 Deed Verification</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">System Roles</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>1. Government Registrar Approval</li>
              <li>2. Landowner Tokenized Listings</li>
              <li>3. Escrow Buyer Transfers</li>
              <li>4. Public Audit Trails</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">Security & Verification</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              All land deeds are cryptographically hashed using SHA-256 and immutably pinned on-chain upon government verification.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Contract Verified
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 TerraChain Protocol. All rights reserved.</p>
          <p>Production Blueprint • Deployed on Render</p>
        </div>
      </div>
    </footer>
  );
};
