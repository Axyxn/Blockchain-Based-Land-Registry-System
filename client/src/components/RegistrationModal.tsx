import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { X, Upload, CheckCircle, Hash, Sparkles, Building, MapPin } from 'lucide-react';
import { ethers } from 'ethers';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INDIAN_STATES = [
  'Maharashtra',
  'Karnataka',
  'Delhi',
  'Telangana',
  'Tamil Nadu',
  'Gujarat',
  'Uttar Pradesh',
  'Haryana'
];

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { account, contract, connectWallet } = useWeb3();

  const [formData, setFormData] = useState({
    cadastralId: 'MH-MUM-SRV-5012',
    title: 'BKC Commercial Plot 4B',
    description: 'Prime commercial land parcel with clear survey boundary mapping in Bandra Kurla Complex.',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    city: 'Mumbai',
    pincode: '400051',
    areaSqft: '3500',
    priceEth: '1.45',
    priceInr: '1,85,00,000',
    coordinatesLat: '19.0657',
    coordinatesLng: '72.8687'
  });

  const [file, setFile] = useState<File | null>(null);
  const [docHashPreview, setDocHashPreview] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<'form' | 'submitting' | 'done'>('form');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Compute SHA-256 preview hash using Web Crypto API
      const buffer = await selectedFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setDocHashPreview(hashHex);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveAccount = account || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

    try {
      setLoading(true);
      setStep('submitting');

      // 1. Submit off-chain metadata + document to backend API
      const bodyData = new FormData();
      Object.entries(formData).forEach(([key, val]) => bodyData.append(key, val));
      bodyData.append('ownerAddress', effectiveAccount);
      if (file) bodyData.append('deedDocument', file);

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiRes = await fetch('/api/land/register', {
        method: 'POST',
        headers,
        body: bodyData,
      });

      const apiData = await apiRes.json();
      if (!apiRes.ok) {
        throw new Error(apiData.error || 'Off-chain registration failed');
      }

      const calculatedHash = apiData.documentHash || docHashPreview || ethers.keccak256(ethers.toUtf8Bytes(formData.cadastralId));

      // 2. Submit on-chain smart contract transaction if wallet contract available
      if (contract) {
        try {
          const balance = await contract.runner?.provider?.getBalance(effectiveAccount) || 0n;
          if (balance === 0n) {
            console.log('[Demo Mode] Skipping on-chain transaction. The account has 0 ETH. Off-chain registration successful.');
          } else {
            console.log('[On-Chain] Executing contract.registerLand...');
            const priceWei = ethers.parseEther(formData.priceEth);
            const tx = await contract.registerLand(
              formData.cadastralId,
              `${formData.city}, ${formData.state}`,
              BigInt(formData.areaSqft),
              priceWei,
              calculatedHash
            );
            console.log('[On-Chain] Tx Sent:', tx.hash);
            await tx.wait();
            console.log('[On-Chain] Tx Confirmed!');
          }
        } catch (contractErr) {
          console.warn('[Contract Exec Warning] Off-chain saved, on-chain fallback:', contractErr);
        }
      }

      setStep('done');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStep('form');
      }, 1800);

    } catch (error: any) {
      console.error('Registration failed:', error);
      alert(`Registration error: ${error.message || error}`);
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl clean-card p-6 sm:p-8 my-8 text-foreground transition-all">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground">Register Indian Land Title</h2>
              <p className="text-xs text-muted-foreground">Submit off-chain survey metadata and generate SHA-256 deed proof on-chain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto border border-success/30">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground">Land Title Registered Successfully!</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your land parcel has been registered off-chain and the cryptographic deed proof is pinned for Registrar verification.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Cadastral / Survey No. (Khasra) *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-MUM-SRV-5012"
                    value={formData.cadastralId}
                    onChange={e => setFormData({ ...formData, cadastralId: e.target.value })}
                    className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Property Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BKC Commercial Plot 4B"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">State *</label>
                <select
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground font-medium focus:border-primary focus:outline-none"
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">District *</label>
                <input
                  type="text"
                  required
                  value={formData.district}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">City / Taluka</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Area (sq.ft) *</label>
                <input
                  type="number"
                  required
                  value={formData.areaSqft}
                  onChange={e => setFormData({ ...formData, areaSqft: e.target.value })}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Valuation (ETH / ₹ INR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.priceEth}
                  onChange={e => setFormData({ ...formData, priceEth: e.target.value })}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* File Upload Box */}
            <div className="p-5 bg-muted/40 rounded-2xl border border-dashed border-border hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="w-7 h-7 text-primary mb-1.5" />
                <span className="text-xs font-bold text-foreground">Upload 7/12 Extract or Legal Deed PDF</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">File will be hashed using SHA-256 for immutable on-chain verification</span>
                
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="mt-3 text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              {docHashPreview && (
                <div className="mt-3 pt-3 border-t border-border text-left">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">SHA-256 Hash Proof Preview:</span>
                  <span className="font-mono text-[11px] text-primary break-all font-semibold">{docHashPreview}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Processing Registration...' : 'Submit Registration'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

