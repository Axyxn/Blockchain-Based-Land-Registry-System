const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistry Smart Contract", function () {
  let landRegistry;
  let owner, registrar, seller, buyer;

  beforeEach(async function () {
    [owner, registrar, seller, buyer] = await ethers.getSigners();

    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistry.deploy(owner.address);
    await landRegistry.waitForDeployment();

    // Add registrar
    await landRegistry.connect(owner).addRegistrar(registrar.address);
  });

  it("Should set correct owner and registrar", async function () {
    expect(await landRegistry.owner()).to.equal(owner.address);
    expect(await landRegistry.isRegistrar(registrar.address)).to.be.true;
  });

  it("Should allow seller to register land parcel", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));

    const tx = await landRegistry.connect(seller).registerLand(
      "CAD-10293",
      "Sector 4, Central District, New York, NY",
      5000,
      ethers.parseEther("1.5"),
      docHash
    );

    const parcel = await landRegistry.getLandParcel(1);
    expect(parcel.cadastralId).to.equal("CAD-10293");
    expect(parcel.currentOwner).to.equal(seller.address);
    expect(parcel.isVerified).to.be.false;
  });

  it("Should allow registrar to verify land parcel", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
    await landRegistry.connect(seller).registerLand("CAD-10293", "NY", 5000, ethers.parseEther("1.5"), docHash);

    await landRegistry.connect(registrar).verifyLand(1);
    const parcel = await landRegistry.getLandParcel(1);
    expect(parcel.isVerified).to.be.true;
  });

  it("Should execute complete escrow and transfer workflow", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
    const price = ethers.parseEther("2.0");

    // 1. Register
    await landRegistry.connect(seller).registerLand("CAD-5555", "CA", 3000, price, docHash);
    
    // 2. Verify
    await landRegistry.connect(registrar).verifyLand(1);

    // 3. List
    await landRegistry.connect(seller).listLandForSale(1, price);

    // 4. Initiate transfer with deposit
    await landRegistry.connect(buyer).initiateTransfer(1, { value: price });

    // 5. Seller approves
    await landRegistry.connect(seller).approveTransferByOwner(1);

    // 6. Registrar final approval & atomic payment + transfer
    const initialSellerBalance = await ethers.provider.getBalance(seller.address);
    await landRegistry.connect(registrar).approveTransferByRegistrar(1);

    const parcel = await landRegistry.getLandParcel(1);
    expect(parcel.currentOwner).to.equal(buyer.address);
    expect(parcel.isForSale).to.be.false;

    const finalSellerBalance = await ethers.provider.getBalance(seller.address);
    expect(finalSellerBalance - initialSellerBalance).to.equal(price);
  });
});
