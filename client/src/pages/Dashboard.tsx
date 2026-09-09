import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { LandCard, LandRecord } from '../components/LandCard';
import { RegistrationModal } from '../components/RegistrationModal';
import { ShieldCheck, PlusCircle, Building2, TrendingUp, Layers, CheckCircle2, AlertCircle, ArrowUpRight, Search } from 'lucide-react';
import { ethers } from 'ethers';

// Mock initial data if backend API is offline during initial load
const MOCK_LAND_RECORDS: LandRecord[] = [
  {
    id: 'b10a23c4-1111-4444-8888-000000000001',
    onchain_id: 1,
    cadastral_id: 'CAD-10928',
    title: 'Beverly Hills Commercial Plot A',
    description: 'Prime commercial zoned real estate parcel with clear cadastral boundary mapping.',
    state: 'California',
    district: 'Los Angeles',
    city: 'Los Angeles',
    area_sqft: 8500,
    price_eth: 3.5,
    owner_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    document_hash: '0xa4e8f9021b332c129d102e9fa189c4d9a112233445566778899aabbccddeeff0',
    document_url: 'https://storage.placeholder.com/land-documents/CAD-10928.pdf',
    status: 'pending_verification',
    created_at: new Date().toISOString()
  },
  {
    id: 'b10a23c4-1111-4444-8888-000000000002',
    onchain_id: 2,
    cadastral_id: 'CAD-55412',
    title: 'Silicon Valley Innovation Hub Plot',
    description: 'High-density tech park land title verified by San Jose District Land Registry.',
    state: 'California',
    district: 'Santa Clara',
    city: 'San Jose',
    area_sqft: 12000,
    price_eth: 5.8,
    owner_address: '0x3C44CdD465734561e52b2b2309111304701cd994',
    document_hash: '0xf5e7d6c5b4a39281701928374650192837465019283746501928374650192837',
    document_url: 'https://storage.placeholder.com/land-documents/CAD-55412.pdf',
    status: 'listed_for_sale',
    created_at: new Date().toISOString()
  },
  {
    id: 'b10a23c4-1111-4444-8888-000000000003',
    onchain_id: 3,
    cadastral_id: 'CAD-88192',
    title: 'Manhattan Waterfront Parcel 4',
    description: 'Luxury residential parcel overlooking Hudson River with verified ownership history.',
    state: 'New York',
    district: 'New York County',
    city: 'New York',
    area_sqft: 4500,
    price_eth: 8.2,
    owner_address: '0x90F79bf6EB2c4f80B08002252A0e2B39589d9703',
    document_hash: '0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
    document_url: 'https://storage.placeholder.com/land-documents/CAD-88192.pdf',
    status: 'verified',
    created_at: new Date().toISOString()
  }
];

export const Dashboard: React.FC = () => {
  const { account, role, contract } = useWeb3();
  
  const [records, setRecords] = useState<LandRecord[]>(MOCK_LAND_RECORDS);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch real records from backend API
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/land/public-ledger');
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          setRecords(data.records);
        }
      }
    } catch (err) {
      console.warn('API query error, using local fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Action Handlers
  const handleRegistrarVerify = async (record: LandRecord) => {
    try {
      if (contract && record.onchain_id) {
        console.log(`[Registrar] Calling contract.verifyLand(${record.onchain_id})...`);
        const tx = await contract.verifyLand(record.onchain_id);
        await tx.wait();
        alert(`Parcel #${record.onchain_id} verified on-chain!`);
      }

      // Sync off-chain status via API
      await fetch('/api/land/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onchainId: record.onchain_id || 1,
          cadastralId: record.cadastral_id,
          registrarAddress: account || 'REGISTRAR'
        })
      });

      fetchRecords();
    } catch (error: any) {
      console.error('Verification failed:', error);
      alert(`Verification error: ${error.message || error}`);
    }
  };

  const handleBuyerBuy = async (record: LandRecord) => {
    try {
      if (!account) {
        alert('Please connect your Web3 wallet first!');
        return;
      }

      if (contract && record.onchain_id) {
        console.log(`[Buyer] Calling contract.initiateTransfer(${record.onchain_id})...`);
        const priceWei = ethers.parseEther(record.price_eth.toString());
        const tx = await contract.initiateTransfer(record.onchain_id, { value: priceWei });
        await tx.wait();
        alert(`Transfer initiated for Parcel #${record.onchain_id}! Funds locked in escrow.`);
      } else {
        alert(`Demo Escrow Initiated for Parcel ${record.cadastral_id} at ${record.price_eth} ETH.`);
      }

      fetchRecords();
    } catch (error: any) {
      console.error('Buy error:', error);
      alert(`Buy error: ${error.message || error}`);
    }
  };

  const handleOwnerList = async (record: LandRecord) => {
    try {
      if (contract && record.onchain_id) {
        const priceWei = ethers.parseEther(record.price_eth.toString());
        const tx = await contract.listLandForSale(record.onchain_id, priceWei);
        await tx.wait();
        alert(`Parcel #${record.onchain_id} listed for sale on-chain!`);
      } else {
        alert(`Parcel ${record.cadastral_id} listed for sale!`);
      }
      fetchRecords();
    } catch (error: any) {
      alert(`Listing error: ${error.message || error}`);
    }
  };

  // Filtered views per role
  const registrarPendingQueue = records.filter(r => r.status === 'pending_verification');
  const ownerPortfolio = records.filter(r => account ? r.owner_address.toLowerCase() === account.toLowerCase() : true);
  const buyerMarketplace = records.filter(r => r.status === 'listed_for_sale' || r.status === 'verified');

  const filteredRecords = () => {
    let base = records;
    if (role === 'registrar') base = registrarPendingQueue;
    if (role === 'owner') base = ownerPortfolio;
    if (role === 'buyer') base = buyerMarketplace;

    if (!searchQuery) return base;
    return base.filter(r =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cadastral_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.district.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Banner / Hero Header */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-8 sm:p-10 border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              On-Chain Title Registry & Escrow
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Blockchain Land Title Management
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Verify land deeds, prevent fraudulent title duplicates, and execute escrow-protected property transfers on an immutable ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Register New Land
            </button>
          </div>
        </div>

        {/* Analytics Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Total Parcels</span>
            <span className="font-heading text-2xl font-bold text-white mt-1 block">{records.length}</span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Govt Verified</span>
            <span className="font-heading text-2xl font-bold text-emerald-400 mt-1 block">
              {records.filter(r => r.status === 'verified' || r.status === 'listed_for_sale').length}
            </span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Pending Queue</span>
            <span className="font-heading text-2xl font-bold text-amber-400 mt-1 block">
              {records.filter(r => r.status === 'pending_verification').length}
            </span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Marketplace Valuation</span>
            <span className="font-heading text-2xl font-bold text-cyan-400 mt-1 block">
              {records.reduce((acc, r) => acc + r.price_eth, 0).toFixed(1)} ETH
            </span>
          </div>
        </div>

      </div>

      {/* Role View Header & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-white capitalize flex items-center gap-2">
            {role === 'registrar' && <Building2 className="w-5 h-5 text-amber-400" />}
            {role === 'owner' && <Layers className="w-5 h-5 text-emerald-400" />}
            {role === 'buyer' && <TrendingUp className="w-5 h-5 text-cyan-400" />}
            {role === 'registrar' && 'Govt Registrar Inspection Queue'}
            {role === 'owner' && 'My Property Portfolio'}
            {role === 'buyer' && 'Public Verified Land Marketplace'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {role === 'registrar' && 'Review legal deed proofs and issue on-chain title verifications'}
            {role === 'owner' && 'Manage your registered parcels and toggle marketplace listings'}
            {role === 'buyer' && 'Explore verified land titles and initiate escrow purchase transfers'}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search parcel, ID, location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Parcels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords().length > 0 ? (
          filteredRecords().map(record => (
            <LandCard
              key={record.id}
              record={record}
              actionText={
                role === 'registrar' && record.status === 'pending_verification'
                  ? 'Verify Deed'
                  : role === 'owner' && record.status === 'verified'
                  ? 'List for Sale'
                  : role === 'buyer' && record.status === 'listed_for_sale'
                  ? 'Buy with Escrow'
                  : undefined
              }
              onActionClick={
                role === 'registrar'
                  ? handleRegistrarVerify
                  : role === 'owner'
                  ? handleOwnerList
                  : role === 'buyer'
                  ? handleBuyerBuy
                  : undefined
              }
            />
          ))
        ) : (
          <div className="col-span-full py-16 text-center glass-panel rounded-3xl border border-slate-800">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="font-heading text-lg font-bold text-slate-300">No Parcels Found in Current View</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try switching your role view from the navbar menu or register a new parcel.
            </p>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRecords}
      />

    </div>
  );
};
