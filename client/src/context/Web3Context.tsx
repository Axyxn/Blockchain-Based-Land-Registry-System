import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

const LAND_REGISTRY_ABI = [
  "function totalParcelsCount() view returns (uint256)",
  "function parcels(uint256) view returns (uint256 id, string cadastralId, string location, uint256 areaInSqFt, uint256 price, address currentOwner, bool isVerified, bool isForSale, bytes32 documentHash)",
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
  "function getParcelsByOwner(address ownerAddr) view returns (uint256[])",
  "function getLandParcel(uint256 parcelId) view returns (tuple(uint256 id, string cadastralId, string location, uint256 areaInSqFt, uint256 price, address currentOwner, bool isVerified, bool isForSale, bytes32 documentHash))"
];

// Fallback contract address for demo/testnet
export const DEFAULT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const DEFAULT_RPC_URL = "http://127.0.0.1:8545";

export type RoleType = 'registrar' | 'owner' | 'buyer';

interface Web3ContextType {
  account: string | null;
  chainId: string | null;
  role: RoleType;
  setRole: (role: RoleType) => void;
  isRegistrarOnChain: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  contract: ethers.Contract | null;
  readContract: ethers.Contract;
  contractAddress: string;
  isConnecting: boolean;
}

const defaultReadOnlyProvider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
const defaultReadOnlyContract = new ethers.Contract(DEFAULT_CONTRACT_ADDRESS, LAND_REGISTRY_ABI, defaultReadOnlyProvider);

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [role, setRole] = useState<RoleType>('buyer');
  const [isRegistrarOnChain, setIsRegistrarOnChain] = useState<boolean>(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const connectWallet = async () => {
    if (typeof (window as any).ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install MetaMask to interact with the blockchain.');
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

      const userContract = new ethers.Contract(DEFAULT_CONTRACT_ADDRESS, LAND_REGISTRY_ABI, signer);
      setContract(userContract);

      // Check on-chain registrar role
      try {
        const isReg = await userContract.isRegistrar(userAccount);
        setIsRegistrarOnChain(isReg);
        if (isReg) setRole('registrar');
      } catch (err) {
        console.warn('Could not check registrar role on-chain:', err);
      }

    } catch (error: any) {
      console.error('Wallet connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setIsRegistrarOnChain(false);
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
        connectWallet,
        disconnectWallet,
        contract,
        readContract: defaultReadOnlyContract,
        contractAddress: DEFAULT_CONTRACT_ADDRESS,
        isConnecting
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
