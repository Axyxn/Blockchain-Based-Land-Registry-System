import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

export const LAND_REGISTRY_ABI = [
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
  "function getLandParcel(uint256 parcelId) view returns (tuple(uint256 id, string cadastralId, string location, uint256 areaInSqFt, uint256 price, address currentOwner, bool isVerified, bool isForSale, bytes32 documentHash))",
  "event LandRegistered(uint256 indexed parcelId, address indexed owner, string cadastralId, string location, uint256 areaInSqFt, uint256 price, bytes32 documentHash)",
  "event LandVerified(uint256 indexed parcelId, address indexed registrar)",
  "event LandListed(uint256 indexed parcelId, uint256 price)",
  "event LandDelisted(uint256 indexed parcelId)",
  "event TransferInitiated(uint256 indexed parcelId, address indexed buyer, uint256 offerAmount)",
  "event TransferApprovedByOwner(uint256 indexed parcelId, address indexed buyer)",
  "event LandTransferred(uint256 indexed parcelId, address indexed previousOwner, address indexed newOwner, uint256 price)",
  "event TransferRejected(uint256 indexed parcelId, address indexed buyer, string reason)"
];

const rpcUrl = process.env.RPC_URL || "https://rpc.sepolia.org";
const privateKey = process.env.PRIVATE_KEY;
export const contractAddress = process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export const provider = new ethers.JsonRpcProvider(rpcUrl);

// Create wallet safely only if a valid private key exists
let walletInstance: ethers.Wallet | null = null;
if (privateKey && privateKey.length === 66 && privateKey !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
  try {
    walletInstance = new ethers.Wallet(privateKey, provider);
  } catch (e) {
    console.warn('[Blockchain Config] Invalid private key provided, wallet instance disabled.');
  }
}

export const wallet = walletInstance;
export const readOnlyContract = new ethers.Contract(contractAddress, LAND_REGISTRY_ABI, provider);
export const landRegistryContract = wallet ? new ethers.Contract(contractAddress, LAND_REGISTRY_ABI, wallet) : readOnlyContract;
