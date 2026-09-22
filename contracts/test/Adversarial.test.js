const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Adversarial Testing - LandRegistry", function () {
  let landRegistry;
  let owner, registrar, seller, buyer, attacker;

  beforeEach(async function () {
    [owner, registrar, seller, buyer, attacker] = await ethers.getSigners();

    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistry.deploy(owner.address);
    await landRegistry.waitForDeployment();

    // Add registrar
    await landRegistry.connect(owner).addRegistrar(registrar.address);
  });

  describe("Access Control Bypass Attempts", function () {
    it("Should prevent non-registrar from verifying land", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
      await landRegistry.connect(seller).registerLand("CAD-HACK-1", "Hacker Land", 1000, 0, docHash);

      await expect(landRegistry.connect(attacker).verifyLand(1))
        .to.be.revertedWith("LandRegistry: Caller is not an authorized registrar");
    });

    it("Should prevent non-registrar from resolving disputes", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
      await landRegistry.connect(seller).registerLand("CAD-HACK-2", "Hacker Land", 1000, 0, docHash);
      await landRegistry.connect(seller).flagDispute(1, "Hacker disputed");

      await expect(landRegistry.connect(attacker).resolveDispute(1))
        .to.be.revertedWith("LandRegistry: Caller is not an authorized registrar");
    });

    it("Should prevent non-owner from listing land for sale", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
      await landRegistry.connect(seller).registerLand("CAD-HACK-3", "Hacker Land", 1000, 0, docHash);
      await landRegistry.connect(registrar).verifyLand(1);

      await expect(landRegistry.connect(attacker).listLandForSale(1, ethers.parseEther("1.0")))
        .to.be.revertedWith("LandRegistry: Caller is not parcel owner");
    });
  });

  describe("State Manipulation & Edge Cases", function () {
    it("Should prevent registering land with 0 area", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
      await expect(landRegistry.connect(seller).registerLand("CAD-HACK-4", "Nowhere", 0, 0, docHash))
        .to.be.revertedWith("LandRegistry: Area must be > 0");
    });

    it("Should prevent listing land with 0 price", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
      await landRegistry.connect(seller).registerLand("CAD-HACK-5", "Hacker Land", 1000, 0, docHash);
      await landRegistry.connect(registrar).verifyLand(1);

      await expect(landRegistry.connect(seller).listLandForSale(1, 0))
        .to.be.revertedWith("LandRegistry: Price must be > 0");
    });

    it("Should prevent initiating transfer with insufficient funds", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
      const price = ethers.parseEther("1.0");
      await landRegistry.connect(seller).registerLand("CAD-HACK-6", "Hacker Land", 1000, price, docHash);
      await landRegistry.connect(registrar).verifyLand(1);
      await landRegistry.connect(seller).listLandForSale(1, price);

      await expect(landRegistry.connect(attacker).initiateTransfer(1, { value: ethers.parseEther("0.5") }))
        .to.be.revertedWith("LandRegistry: Insufficient funds sent");
    });

    it("Should prevent initiating transfer for unverified or unlisted land", async function () {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes("Deed Document Content"));
      const price = ethers.parseEther("1.0");
      await landRegistry.connect(seller).registerLand("CAD-HACK-7", "Hacker Land", 1000, price, docHash);
      
      // Try to transfer unverified
      await expect(landRegistry.connect(attacker).initiateTransfer(1, { value: price }))
        .to.be.revertedWith("LandRegistry: Parcel is not verified");

      await landRegistry.connect(registrar).verifyLand(1);

      // Try to transfer unlisted
      await expect(landRegistry.connect(attacker).initiateTransfer(1, { value: price }))
        .to.be.revertedWith("LandRegistry: Parcel is not for sale");
    });
  });
});
