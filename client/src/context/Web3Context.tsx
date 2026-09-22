import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const LAND_REGISTRY_ABI = [
  "function totalParcelsCount() view returns (uint256)",
  "function parcels(uint256) view returns (uint256 id, string cadastralId, string location, uint256 areaInSqFt, uint256 price, address currentOwner, bool isVerified, bool isForSale, bool isDisputed, bytes32 documentHash)",
  "function disputes(uint256) view returns (address reporter, string reason, uint256 timestamp, bool isResolved)",
  "function transferRequests(uint256) view returns (address buyer, uint256 offeredPrice, uint8 status, uint256 createdAt)",
  "function isRegistrar(address) view returns (bool)",
  "function owner() view returns (address)",
  "function registerLand(string cadastralId, string location, uint256 areaInSqFt, uint256 price, bytes32 documentHash) returns (uint256)",
  "function verifyLand(uint256 parcelId)",
  "function listLandForSale(uint256 parcelId, uint256 price)",
  "function delistLand(uint256 parcelId)",
  "function initiateTransfer(uint256 parcelId) payable",
  "function approveTransferByOwner(uint256 parcelId)",
  "function approveTransferByRegistrar(uint256 parcelId)",
  "function rejectTransfer(uint256 parcelId, string reason)",
  "function flagDispute(uint256 parcelId, string reason)",
  "function resolveDispute(uint256 parcelId)",
  "function getParcelsByOwner(address ownerAddr) view returns (uint256[])",
  "function getLandParcel(uint256 parcelId) view returns (tuple(uint256 id, string cadastralId, string location, uint256 areaInSqFt, uint256 price, address currentOwner, bool isVerified, bool isForSale, bool isDisputed, bytes32 documentHash))"
];

// Default contract address & RPC endpoint for local Hardhat node
export const DEFAULT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const DEFAULT_RPC_URL = "http://127.0.0.1:8545";

export type RoleType = 'registrar' | 'owner' | 'buyer';

export const DEMO_ACCOUNTS: Record<RoleType, { name: string; address: string; privateKey: string }> = {
  registrar: {
    name: 'Dept. of Land Revenue (Registrar - New Delhi)',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  },
  owner: {
    name: 'Rajesh Sharma (Landowner - Mumbai)',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
  },
  buyer: {
    name: 'Priya Patel (Buyer - Bengaluru)',
    address: '0x3C44CdDDBD6a900fa2b585dd299e03d12FA4293E',
    privateKey: '0x5de4111daf476a9c5b14a938d8a57a30e53a6b5304b58060d2b52626890d2929'
  }
};

interface Web3ContextType {
  account: string | null;
  chainId: string | null;
  role: RoleType;
  setRole: (role: RoleType) => void;
  isRegistrarOnChain: boolean;
  isDemoMode: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  contract: ethers.Contract | null;
  readContract: ethers.Contract;
  contractAddress: string;
  isConnecting: boolean;
  switchDemoAccount: (role: RoleType) => void;
}

const defaultReadOnlyProvider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
const defaultReadOnlyContract = new ethers.Contract(DEFAULT_CONTRACT_ADDRESS, LAND_REGISTRY_ABI, defaultReadOnlyProvider);

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>('31337');
  const [role, setRoleState] = useState<RoleType>('buyer');
  const [isRegistrarOnChain, setIsRegistrarOnChain] = useState<boolean>(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Setup Demo Local Hardhat Wallet Signer for a specific role
  const setupDemoWallet = async (targetRole: RoleType) => {
    try {
      const demoAccount = DEMO_ACCOUNTS[targetRole];
      const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
      const walletSigner = new ethers.Wallet(demoAccount.privateKey, provider);
      const demoContract = new ethers.Contract(DEFAULT_CONTRACT_ADDRESS, LAND_REGISTRY_ABI, walletSigner);

      // Authenticate with backend for demo mode
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole, walletAddress: demoAccount.address })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
      } else {
        console.warn('[Demo Web3] Backend auth failed for demo account.');
      }

      setAccount(demoAccount.address);
      setChainId('31337');
      setContract(demoContract);
      setIsDemoMode(true);
      setIsRegistrarOnChain(targetRole === 'registrar');
      console.log(`[Demo Web3] Connected as ${demoAccount.name} (${demoAccount.address})`);
    } catch (err) {
      console.warn('[Demo Web3 Setup Failed]', err);
    }
  };

  const setRole = (newRole: RoleType) => {
    setRoleState(newRole);
    if (isDemoMode || !account) {
      setupDemoWallet(newRole);
    }
  };

  const switchDemoAccount = (targetRole: RoleType) => {
    setRole(targetRole);
  };

  // Auto-connect Demo Wallet on mount if MetaMask not explicitly connected
  useEffect(() => {
    if (typeof (window as any).ethereum === 'undefined' && !account) {
      setupDemoWallet('buyer');
    }
  }, []);

  const connectWallet = async () => {
    if (typeof (window as any).ethereum === 'undefined') {
      console.info('MetaMask not detected. Initializing Demo Local Hardhat Wallet Provider.');
      setupDemoWallet(role);
      return;
    }

    try {
      setIsConnecting(true);
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const signer = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      const userAccount = accounts[0];
      setAccount(userAccount);
      setChainId(network.chainId.toString());
      setIsDemoMode(false);

      const userContract = new ethers.Contract(DEFAULT_CONTRACT_ADDRESS, LAND_REGISTRY_ABI, signer);
      setContract(userContract);

      // Check on-chain registrar role
      let isReg = false;
      try {
        isReg = await userContract.isRegistrar(userAccount);
        setIsRegistrarOnChain(isReg);
      } catch (err) {
        console.warn('Could not check registrar role on-chain:', err);
      }

      // SIWE Authentication Flow
      try {
        const nonceRes = await fetch('/api/auth/nonce');
        const nonce = await nonceRes.text();

        const domain = window.location.host;
        const origin = window.location.origin;
        const statement = 'Sign in with Ethereum to the Land Registry app.';
        const siweMessage = new SiweMessage({
          domain,
          address: userAccount,
          statement,
          uri: origin,
          version: '1',
          chainId: Number(network.chainId),
          nonce,
        });
        const messageToSign = siweMessage.prepareMessage();
        
        const signature = await signer.signMessage(messageToSign);

        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageToSign, signature })
        });

        if (!verifyRes.ok) {
          throw new Error('Authentication failed');
        }

        const verifyData = await verifyRes.json();
        localStorage.setItem('token', verifyData.token);
        
        if (verifyData.profile) {
          setRoleState(verifyData.profile.role as RoleType);
        } else if (isReg) {
          setRoleState('registrar');
        }
      } catch (authErr) {
        console.error('SIWE Auth error:', authErr);
        if (isReg) setRoleState('registrar');
      }

    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setupDemoWallet(role);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setIsRegistrarOnChain(false);
    setIsDemoMode(false);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    if (typeof (window as any).ethereum !== 'undefined') {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      });

      (window as any).ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        role,
        setRole,
        isRegistrarOnChain,
        isDemoMode,
        connectWallet,
        disconnectWallet,
        contract,
        readContract: defaultReadOnlyContract,
        contractAddress: DEFAULT_CONTRACT_ADDRESS,
        isConnecting,
        switchDemoAccount
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

