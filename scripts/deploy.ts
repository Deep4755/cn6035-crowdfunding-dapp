const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
	const Crowdfund = await ethers.getContractFactory("Crowdfund");

	// Get network info
	const network = await ethers.provider.getNetwork();
	const chainId = Number(network.chainId);
	const networkName = network.name === "unknown" ? 
		(hre.network.name || "localhost") : 
		hre.network.name;

	console.log(`Deploying Crowdfund contract to ${networkName} (Chain ID: ${chainId})...`);
	const crowdfund = await Crowdfund.deploy();
    if (!crowdfund) {
        throw new Error("Oops! Crowdfund contract not deployed");
    }

	await crowdfund.waitForDeployment();
	const address = await crowdfund.getAddress();
	console.log("Crowdfund deployed to:", address);

	try {
		const dir = path.join(__dirname, "..", "frontend", "src", "constants");
		fs.mkdirSync(dir, { recursive: true });
		
		// Determine which deployment file to use based on network
		let deploymentFile = "deployments.localhost.json";
		
		if (chainId === 11155111) {
			// Sepolia testnet
			deploymentFile = "deployments.sepolia.json";
		} else if (chainId === 80001) {
			// Mumbai testnet
			deploymentFile = "deployments.mumbai.json";
		} else if (chainId === 31337 || chainId === 1337) {
			// Localhost/Hardhat
			deploymentFile = "deployments.localhost.json";
		} else if (networkName === "sepolia") {
			deploymentFile = "deployments.sepolia.json";
		} else if (networkName === "mumbai") {
			deploymentFile = "deployments.mumbai.json";
		}
		
		const out = path.join(dir, deploymentFile);
		fs.writeFileSync(out, JSON.stringify({ Crowdfund: { address } }, null, 2));
		console.log(`Saved deployment file: ${out}`);

		// Print deployment proof summary
		console.log("\n========================================");
		console.log("  DEPLOYMENT PROOF SUMMARY");
		console.log("========================================");
		console.log(`  Network   : ${networkName}`);
		console.log(`  Chain ID  : ${chainId}`);
		console.log(`  Contract  : ${address}`);
		console.log(`  Saved to  : ${deploymentFile}`);
		if (chainId === 11155111) {
			console.log(`  Etherscan : https://sepolia.etherscan.io/address/${address}`);
		}
		console.log("========================================\n");
	} catch (err) {
		console.warn("Failed writing deployment for frontend:", err);
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});