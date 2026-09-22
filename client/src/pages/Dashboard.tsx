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
    cadastral_id: 'MH-MUM-SRV-4092',
    title: 'BKC Commercial Plot 4B',
    description: 'Prime commercial land title in Bandra Kurla Complex with 7/12 extract verification.',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    city: 'Mumbai',
    pincode: '400051',
    area_sqft: 8500,
    price_eth: 3.5,
    owner_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    document_hash: '0xa4e8f9021b332c129d102e9fa189c4d9a112233445566778899aabbccddeeff0',
    document_url: 'https://storage.placeholder.com/land-documents/MH-MUM-SRV-4092.pdf',
    status: 'pending_verification',
    created_at: new Date().toISOString()
  },
  {
    id: 'b10a23c4-1111-4444-8888-000000000002',
    onchain_id: 2,
    cadastral_id: 'KA-BLR-KHS-8821',
    title: 'Whitefield Cyber Tech Park Parcel',
    description: 'IT Zoned real estate parcel verified by Bengaluru Urban District Registrar.',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    city: 'Bengaluru',
    pincode: '560066',
    area_sqft: 12000,
    price_eth: 5.8,
    owner_address: '0x3C44CdDDBD6a900fa2b585dd299e03d12FA4293E',
    document_hash: '0xf5e7d6c5b4a39281701928374650192837465019283746501928374650192837',
    document_url: 'https://storage.placeholder.com/land-documents/KA-BLR-KHS-8821.pdf',
    status: 'listed_for_sale',
    created_at: new Date().toISOString()
  },
  {
    id: 'b10a23c4-1111-4444-8888-000000000003',
    onchain_id: 3,
    cadastral_id: 'DL-NDL-CT-1092',
    title: 'Lutyens Sector 4 Prime Parcel',
    description: 'High-value central New Delhi title deed registered under Dept of Revenue.',
    state: 'Delhi',
    district: 'New Delhi',
    city: 'New Delhi',
    pincode: '110001',
    area_sqft: 4500,
    price_eth: 8.2,
    owner_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    document_hash: '0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
    document_url: 'https://storage.placeholder.com/land-documents/DL-NDL-CT-1092.pdf',
    status: 'verified',
    created_at: new Date().toISOString()
  },
  {
    id: 'b10a23c4-1111-4444-8888-000000000004',
    onchain_id: 4,
    cadastral_id: 'TS-HYD-SRV-3390',
    title: 'Gachibowli Financial District Land',
    description: 'Clear boundary title in Hyderabad tech Corridor verified by TS-Registration portal.',
    state: 'Telangana',
    district: 'Hyderabad',
    city: 'Hyderabad',
    pincode: '500032',
    area_sqft: 6200,
    price_eth: 2.9,
    owner_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    document_hash: '0x99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff',
    document_url: 'https://storage.placeholder.com/land-documents/TS-HYD-SRV-3390.pdf',
    status: 'listed_for_sale',
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

      const token = localStorage.getItem('token');
      await fetch('/api/land/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
    <div className="space-y-8 pb-10">
      
      {/* Top Banner / Hero Header */}
      <div className="relative clean-card p-8 sm:p-10 border border-border">
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              On-Chain Title Registry
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Blockchain Land Title Management
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Verify land deeds, prevent fraudulent title duplicates, and execute escrow-protected property transfers on an immutable ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Register New Land
            </button>
          </div>
        </div>

        {/* Analytics Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border">
          <div className="bg-background/50 p-4 rounded-xl border border-border">
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">Total Parcels</span>
            <span className="font-heading text-2xl font-extrabold text-foreground mt-1 block">{records.length}</span>
          </div>
          <div className="bg-background/50 p-4 rounded-xl border border-border">
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">Govt Verified</span>
            <span className="font-heading text-2xl font-extrabold text-success mt-1 block">
              {records.filter(r => r.status === 'verified' || r.status === 'listed_for_sale').length}
            </span>
          </div>
          <div className="bg-background/50 p-4 rounded-xl border border-border">
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">Pending Queue</span>
            <span className="font-heading text-2xl font-extrabold text-warning mt-1 block">
              {records.filter(r => r.status === 'pending_verification').length}
            </span>
          </div>
          <div className="bg-background/50 p-4 rounded-xl border border-border">
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block">Marketplace Valuation</span>
            <span className="font-heading text-2xl font-extrabold text-primary mt-1 block">
              ₹{((records.reduce((acc, r) => acc + r.price_eth, 0) * 25000000) / 10000000).toFixed(2)} Cr <span className="text-sm font-medium text-muted-foreground">({records.reduce((acc, r) => acc + r.price_eth, 0).toFixed(1)} ETH)</span>
            </span>
          </div>
        </div>

      </div>

      {/* Role View Header & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground capitalize flex items-center gap-2">
            {role === 'registrar' && <Building2 className="w-5 h-5 text-warning" />}
            {role === 'owner' && <Layers className="w-5 h-5 text-success" />}
            {role === 'buyer' && <TrendingUp className="w-5 h-5 text-primary" />}
            {role === 'registrar' && 'Govt Registrar Inspection Queue'}
            {role === 'owner' && 'My Property Portfolio'}
            {role === 'buyer' && 'Public Verified Land Marketplace'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {role === 'registrar' && 'Review legal deed proofs and issue on-chain title verifications'}
            {role === 'owner' && 'Manage your registered parcels and toggle marketplace listings'}
            {role === 'buyer' && 'Explore verified land titles and initiate escrow purchase transfers'}
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search parcel, ID, location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-foreground shadow-sm placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Parcels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecords().length > 0 ? (
          filteredRecords().map(record => (
            <div key={record.id} className="clean-card clean-card-hover border border-border flex flex-col overflow-hidden">
              <LandCard
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
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center clean-card border border-border border-dashed">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-heading text-lg font-bold text-foreground">No Parcels Found in Current View</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Try switching your role view from the sidebar menu or register a new parcel.
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
