// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LandRegistry
 * @dev On-chain immutable ledger for land titles, role-based verifications, and escrow-backed transfers.
 */
contract LandRegistry is Ownable, ReentrancyGuard, Pausable {

    enum TransferStatus { None, Pending, ApprovedByOwner, Completed, Rejected }

    struct LandParcel {
        uint256 id;
        string cadastralId;
        string location;
        uint256 areaInSqFt;
        uint256 price;
        address currentOwner;
        bool isVerified;
        bool isForSale;
        bool isDisputed;
        bytes32 documentHash;
    }

    struct Dispute {
        address reporter;
        string reason;
        uint256 timestamp;
        bool isResolved;
    }

    struct TransferRequest {
        address buyer;
        uint256 offeredPrice;
        TransferStatus status;
        uint256 createdAt;
    }

    // State Variables
    uint256 public totalParcelsCount;
    mapping(uint256 => LandParcel) public parcels;
    mapping(address => uint256[]) private _ownerParcels;
    mapping(uint256 => TransferRequest) public transferRequests;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => bool) public isRegistrar;

    // Events
    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    event LandRegistered(
        uint256 indexed parcelId,
        address indexed owner,
        string cadastralId,
        string location,
        uint256 areaInSqFt,
        uint256 price,
        bytes32 documentHash
    );
    event LandVerified(uint256 indexed parcelId, address indexed registrar);
    event LandListed(uint256 indexed parcelId, uint256 price);
    event LandDelisted(uint256 indexed parcelId);
    event TransferInitiated(uint256 indexed parcelId, address indexed buyer, uint256 offerAmount);
    event TransferApprovedByOwner(uint256 indexed parcelId, address indexed buyer);
    event LandTransferred(
        uint256 indexed parcelId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 price
    );
    event TransferRejected(uint256 indexed parcelId, address indexed buyer, string reason);
    event EscrowRefunded(uint256 indexed parcelId, address indexed buyer, uint256 amount);
    event DisputeFlagged(uint256 indexed parcelId, address indexed reporter, string reason);
    event DisputeResolved(uint256 indexed parcelId, address indexed registrar);

    // Modifiers
    modifier onlyRegistrar() {
        require(isRegistrar[msg.sender] || msg.sender == owner(), "LandRegistry: Caller is not an authorized registrar");
        _;
    }

    modifier onlyLandOwner(uint256 parcelId) {
        require(parcels[parcelId].currentOwner == msg.sender, "LandRegistry: Caller is not parcel owner");
        _;
    }

    modifier parcelExists(uint256 parcelId) {
        require(parcelId > 0 && parcelId <= totalParcelsCount, "LandRegistry: Parcel does not exist");
        _;
    }

    modifier parcelNotDisputed(uint256 parcelId) {
        require(!parcels[parcelId].isDisputed, "LandRegistry: Parcel is currently disputed");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        isRegistrar[initialOwner] = true;
        emit RegistrarAdded(initialOwner);
    }

    // Admin / Registrar Management
    function addRegistrar(address registrar) external onlyOwner {
        require(registrar != address(0), "LandRegistry: Invalid address");
        require(!isRegistrar[registrar], "LandRegistry: Already a registrar");
        isRegistrar[registrar] = true;
        emit RegistrarAdded(registrar);
    }

    function removeRegistrar(address registrar) external onlyOwner {
        require(isRegistrar[registrar], "LandRegistry: Not a registrar");
        isRegistrar[registrar] = false;
        emit RegistrarRemoved(registrar);
    }

    // Pause functionality
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Register a new land parcel on-chain
     */
    function registerLand(
        string memory cadastralId,
        string memory location,
        uint256 areaInSqFt,
        uint256 price,
        bytes32 documentHash
    ) external whenNotPaused returns (uint256) {
        require(bytes(cadastralId).length > 0, "LandRegistry: Cadastral ID required");
        require(areaInSqFt > 0, "LandRegistry: Area must be > 0");
        require(documentHash != bytes32(0), "LandRegistry: Invalid document hash");

        totalParcelsCount++;
        uint256 parcelId = totalParcelsCount;

        parcels[parcelId] = LandParcel({
            id: parcelId,
            cadastralId: cadastralId,
            location: location,
            areaInSqFt: areaInSqFt,
            price: price,
            currentOwner: msg.sender,
            isVerified: false,
            isForSale: false,
            isDisputed: false,
            documentHash: documentHash
        });

        _ownerParcels[msg.sender].push(parcelId);

        emit LandRegistered(parcelId, msg.sender, cadastralId, location, areaInSqFt, price, documentHash);
        return parcelId;
    }

    /**
     * @dev Authorized Registrar verifies the title and deed proof
     */
    function verifyLand(uint256 parcelId) external onlyRegistrar parcelExists(parcelId) whenNotPaused {
        LandParcel storage parcel = parcels[parcelId];
        require(!parcel.isVerified, "LandRegistry: Land already verified");

        parcel.isVerified = true;
        emit LandVerified(parcelId, msg.sender);
    }

    /**
     * @dev List verified parcel for sale
     */
    function listLandForSale(uint256 parcelId, uint256 price) external onlyLandOwner(parcelId) parcelExists(parcelId) parcelNotDisputed(parcelId) whenNotPaused {
        LandParcel storage parcel = parcels[parcelId];
        require(parcel.isVerified, "LandRegistry: Land must be verified by registrar before listing");
        require(price > 0, "LandRegistry: Price must be > 0");

        parcel.isForSale = true;
        parcel.price = price;

        emit LandListed(parcelId, price);
    }

    /**
     * @dev Delist parcel from sale
     */
    function delistLand(uint256 parcelId) external onlyLandOwner(parcelId) parcelExists(parcelId) whenNotPaused {
        LandParcel storage parcel = parcels[parcelId];
        require(parcel.isForSale, "LandRegistry: Land is not listed for sale");

        parcel.isForSale = false;
        emit LandDelisted(parcelId);
    }

    /**
     * @dev Buyer initiates title purchase by locking funds into contract escrow
     */
    function initiateTransfer(uint256 parcelId) external payable parcelExists(parcelId) parcelNotDisputed(parcelId) nonReentrant whenNotPaused {
        LandParcel storage parcel = parcels[parcelId];
        require(parcel.isVerified, "LandRegistry: Parcel is not verified");
        require(parcel.isForSale, "LandRegistry: Parcel is not for sale");
        require(msg.sender != parcel.currentOwner, "LandRegistry: Owner cannot buy own parcel");
        require(msg.value >= parcel.price, "LandRegistry: Insufficient funds sent");

        TransferRequest storage req = transferRequests[parcelId];
        require(req.status == TransferStatus.None || req.status == TransferStatus.Rejected, "LandRegistry: Active transfer request already exists");

        transferRequests[parcelId] = TransferRequest({
            buyer: msg.sender,
            offeredPrice: msg.value,
            status: TransferStatus.Pending,
            createdAt: block.timestamp
        });

        emit TransferInitiated(parcelId, msg.sender, msg.value);
    }

    /**
     * @dev Seller approves buyer's offer
     */
    function approveTransferByOwner(uint256 parcelId) external onlyLandOwner(parcelId) parcelExists(parcelId) parcelNotDisputed(parcelId) whenNotPaused {
        TransferRequest storage req = transferRequests[parcelId];
        require(req.status == TransferStatus.Pending, "LandRegistry: No pending request");

        req.status = TransferStatus.ApprovedByOwner;
        emit TransferApprovedByOwner(parcelId, req.buyer);
    }

    /**
     * @dev Government Registrar performs final approval, transferring title & executing payment to seller
     */
    function approveTransferByRegistrar(uint256 parcelId) external onlyRegistrar parcelExists(parcelId) parcelNotDisputed(parcelId) nonReentrant whenNotPaused {
        TransferRequest storage req = transferRequests[parcelId];
        require(req.status == TransferStatus.ApprovedByOwner, "LandRegistry: Owner must approve first");

        LandParcel storage parcel = parcels[parcelId];
        address previousOwner = parcel.currentOwner;
        address newOwner = req.buyer;
        uint256 paymentAmount = req.offeredPrice;

        // Update ownership state
        parcel.currentOwner = newOwner;
        parcel.isForSale = false;
        req.status = TransferStatus.Completed;

        // Update helper arrays
        _removeParcelFromOwner(previousOwner, parcelId);
        _ownerParcels[newOwner].push(parcelId);

        // Transfer escrowed funds to previous owner
        (bool success, ) = payable(previousOwner).call{value: paymentAmount}("");
        require(success, "LandRegistry: Payment to seller failed");

        emit LandTransferred(parcelId, previousOwner, newOwner, paymentAmount);
    }

    /**
     * @dev Flag a dispute on a land parcel
     */
    function flagDispute(uint256 parcelId, string memory reason) external parcelExists(parcelId) whenNotPaused {
        LandParcel storage parcel = parcels[parcelId];
        require(!parcel.isDisputed, "LandRegistry: Parcel already disputed");
        require(bytes(reason).length > 0, "LandRegistry: Reason required");

        TransferRequest memory req = transferRequests[parcelId];
        require(
            msg.sender == parcel.currentOwner ||
            msg.sender == req.buyer ||
            isRegistrar[msg.sender] ||
            msg.sender == owner(),
            "LandRegistry: Unauthorized to flag dispute"
        );

        parcel.isDisputed = true;
        parcel.isForSale = false;

        disputes[parcelId] = Dispute({
            reporter: msg.sender,
            reason: reason,
            timestamp: block.timestamp,
            isResolved: false
        });

        emit DisputeFlagged(parcelId, msg.sender, reason);
    }

    /**
     * @dev Resolve a dispute on a land parcel
     */
    function resolveDispute(uint256 parcelId) external onlyRegistrar parcelExists(parcelId) whenNotPaused {
        LandParcel storage parcel = parcels[parcelId];
        require(parcel.isDisputed, "LandRegistry: Parcel is not disputed");

        parcel.isDisputed = false;
        disputes[parcelId].isResolved = true;

        emit DisputeResolved(parcelId, msg.sender);
    }

    /**
     * @dev Reject transfer request and refund escrowed funds to buyer
     */
    function rejectTransfer(uint256 parcelId, string memory reason) external parcelExists(parcelId) nonReentrant whenNotPaused {
        TransferRequest storage req = transferRequests[parcelId];
        require(req.status == TransferStatus.Pending || req.status == TransferStatus.ApprovedByOwner, "LandRegistry: No pending request to reject");
        
        LandParcel memory parcel = parcels[parcelId];
        require(
            msg.sender == parcel.currentOwner || isRegistrar[msg.sender] || msg.sender == owner() || msg.sender == req.buyer,
            "LandRegistry: Unauthorized caller"
        );

        address buyer = req.buyer;
        uint256 refundAmount = req.offeredPrice;

        req.status = TransferStatus.Rejected;
        req.offeredPrice = 0;

        // Refund buyer
        (bool success, ) = payable(buyer).call{value: refundAmount}("");
        require(success, "LandRegistry: Refund to buyer failed");

        emit TransferRejected(parcelId, buyer, reason);
        emit EscrowRefunded(parcelId, buyer, refundAmount);
    }

    // Helper functions
    function getParcelsByOwner(address ownerAddr) external view returns (uint256[] memory) {
        return _ownerParcels[ownerAddr];
    }

    function getLandParcel(uint256 parcelId) external view parcelExists(parcelId) returns (LandParcel memory) {
        return parcels[parcelId];
    }

    function _removeParcelFromOwner(address ownerAddr, uint256 parcelId) private {
        uint256[] storage list = _ownerParcels[ownerAddr];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == parcelId) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
    }
}
