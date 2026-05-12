import { ethers, network, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer signer — set DEPLOYER_PRIVATE_KEY");

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`\nDeploying AuraToken to ${network.name} (chainId ${network.config.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH\n`);

  const Aura = await ethers.getContractFactory("AuraToken");
  const aura = await Aura.deploy(deployer.address);
  await aura.waitForDeployment();

  const address = await aura.getAddress();
  console.log(`AuraToken deployed: ${address}`);

  if (network.name === "base") {
    console.log(`BaseScan: https://basescan.org/address/${address}`);
  } else if (network.name === "baseSepolia") {
    console.log(`BaseScan Sepolia: https://sepolia.basescan.org/address/${address}`);
  }

  if (process.env.BASESCAN_API_KEY && network.name !== "hardhat") {
    console.log("\nWaiting 30s before verification...");
    await new Promise((r) => setTimeout(r, 30_000));
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [deployer.address],
      });
    } catch (err) {
      console.warn("Verification failed (non-fatal):", err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
