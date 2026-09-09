import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { X, Upload, FileText, CheckCircle, ShieldCheck, MapPin, Hash, Sparkles } from 'lucide-react';
import { ethers } from 'ethers';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { account, contract, connectWallet } = useWeb3();

  const [formData, setFormData] = useState({
    cadastralId: '',
    title: '',
    description: '',
    state: 'California',
    district: 'Los Angeles',
    city: 'Los Angeles',
    pincode: '90001',
    areaSqft: '2500',
    priceEth: '1.2',
    coordinatesLat: '34.0522',
    coordinatesLng: '-118.2437'
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
    if (!account) {
      alert('Please connect your Web3 wallet first.');
      await connectWallet();
      return;
    }

    try {
      setLoading(true);
      setStep('submitting');

      // 1. Submit off-chain metadata + document to backend API
      const bodyData = new FormData();
      Object.entries(formData).forEach(([key, val]) => bodyData.append(key, val));
      bodyData.append('ownerAddress', account);
      if (file) bodyData.append('deedDocument', file);

      const apiRes = await fetch('/api/land/register', {
        method: 'POST',
        body: bodyData,
      });

      const apiData = await apiRes.json();
      if (!apiRes.ok) {
        throw new Error(apiData.error || 'Off-chain registration failed');
      }

      const calculatedHash = apiData.documentHash || docHashPreview || ethers.keccak256(ethers.toUtf8Bytes(formData.cadastralId));

      // 2. Submit on-chain smart contract transaction if wallet contract available
      if (contract) {
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
      } else {
        console.warn('[Demo Mode] Wallet contract not attached. Record saved in Supabase.');
      }

      setStep('done');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStep('form');
      }, 2000);

    } catch (error: any) {
      console.error('Registration failed:', error);
      alert(`Registration error: ${error.message || error}`);
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white">Register Land Parcel</h2>
              <p className="text-xs text-slate-400">Submit off-chain survey metadata and pin deed proof on-chain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 glow-emerald">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white">Land Title Registered Successfully!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your land parcel is registered off-chain and the cryptographic proof is logged on-chain awaiting Registrar verification.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Cadastral Survey Number *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAD-98214"
                    value={formData.cadastralId}
                    onChange={e => setFormData({ ...formData, cadastralId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Property Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunset Heights Plot 12"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">District *</label>
                <input
                  type="text"
                  required
                  value={formData.district}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Area (sq.ft) *</label>
                <input
                  type="number"
                  required
                  value={formData.areaSqft}
                  onChange={e => setFormData({ ...formData, areaSqft: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Listed Price (ETH) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.priceEth}
                  onChange={e => setFormData({ ...formData, priceEth: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* File Upload Box */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-dashed border-slate-700 hover:border-emerald-500/50 transition-colors">
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">Upload Cadastral Survey / Legal Deed PDF</span>
                <span className="text-[11px] text-slate-400 mt-0.5">File will be hashed using SHA-256 for on-chain verification</span>
                
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="mt-3 text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 cursor-pointer"
                />
              </div>

              {docHashPreview && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Generated SHA-256 Hash Proof:</span>
                  <span className="font-mono text-[11px] text-emerald-400 break-all">{docHashPreview}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing Transaction...' : 'Confirm Registration'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
