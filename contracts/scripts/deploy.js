const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("==================================================");
  console.log("Deploying LandRegistry contract with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log("==================================================");

  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy(deployer.address);

  await landRegistry.waitForDeployment();

  const contractAddress = await landRegistry.getAddress();

  console.log("LandRegistry deployed to:", contractAddress);
  console.log("Initial Owner/Registrar set to:", deployer.address);
  console.log("==================================================");

  // Verification prompt guidance
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for 5 block confirmations before verifying...");
    await landRegistry.deploymentTransaction().wait(5);

    console.log("Verifying contract on Etherscan/Polygonscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [deployer.address],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Verification error:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
