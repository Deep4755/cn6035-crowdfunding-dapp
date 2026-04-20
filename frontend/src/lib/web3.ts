import { ethers } from "ethers";
import deploymentsLocalhost from "@/constants/deployments.localhost.json";
import deploymentsSepolia from "@/constants/deployments.sepolia.json";
import crowdfundArtifact from "@/constants/Crowdfund.json";

// Minimal EIP-1193 provider shape
type EIP1193Provider = {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
	on?: (event: string, listener: (...args: unknown[]) => void) => void;
	removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

type DeploymentsFile = { Crowdfund?: { address?: string } };
type CrowdfundArtifact = { abi: ethers.InterfaceAbi };

export function getBrowserProvider(): ethers.BrowserProvider | null {
	if (typeof window === "undefined") return null;
	const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
	if (!eth) return null;
	return new ethers.BrowserProvider(eth);
}

export async function getSigner(): Promise<ethers.Signer | null> {
	const provider = getBrowserProvider();
	if (!provider) return null;
	return await provider.getSigner();
}

/**
 * Get the contract address based on the current network
 * Falls back to localhost if network not detected or not supported
 */
export async function getCrowdfundAddress(): Promise<string | undefined> {
	try {
		const provider = getBrowserProvider();
		if (!provider) {
			console.log("🔄 No provider, using localhost address");
			return (deploymentsLocalhost as unknown as DeploymentsFile)?.Crowdfund?.address;
		}

		const network = await provider.getNetwork();
		const chainId = Number(network.chainId);
		console.log("🌐 Detected network:", { chainId, name: network.name });

		// Sepolia testnet
		if (chainId === 11155111) {
			const address = (deploymentsSepolia as unknown as DeploymentsFile)?.Crowdfund?.address;
			console.log("📍 Using Sepolia address:", address);
			// Only return if address is set (not the default placeholder)
			if (address && address !== "0x0000000000000000000000000000000000000000") {
				return address;
			}
		}

		// Localhost / Hardhat
		if (chainId === 31337 || chainId === 1337) {
			const address = (deploymentsLocalhost as unknown as DeploymentsFile)?.Crowdfund?.address;
			console.log("📍 Using localhost address:", address);
			return address;
		}

		// Default to localhost for development
		const address = (deploymentsLocalhost as unknown as DeploymentsFile)?.Crowdfund?.address;
		console.log("📍 Using default localhost address:", address);
		return address;
	} catch (error) {
		console.log("❌ Error getting address:", error);
		// Fallback to localhost on error
		return (deploymentsLocalhost as unknown as DeploymentsFile)?.Crowdfund?.address;
	}
}

export async function getCrowdfundReadContract(): Promise<ethers.Contract | null> {
	const provider = getBrowserProvider();
	const address = await getCrowdfundAddress();
	if (!provider || !address) return null;
	try {
		const network = await provider.getNetwork();
		console.log("🔍 Checking read contract at:", { address, chainId: Number(network.chainId) });
		
		const code = await provider.getCode(address);
		if (!code || code === "0x") {
			console.log("❌ No contract code found for reading at:", address);
			return null;
		}
		console.log("✅ Read contract found at:", address);
	} catch {
		// Silently fail — node may be temporarily busy
		return null;
	}
	return new ethers.Contract(address, (crowdfundArtifact as unknown as CrowdfundArtifact).abi, provider);
}

export async function getCrowdfundWriteContract(): Promise<ethers.Contract | null> {
	const signer = await getSigner();
	const address = await getCrowdfundAddress();
	if (!signer || !address) {
		console.log("❌ Contract connection failed:", { signer: !!signer, address });
		return null;
	}
	try {
		const provider = (signer.provider ?? await getBrowserProvider());
		if (!provider) {
			console.log("❌ No provider available");
			return null;
		}
		const network = await provider.getNetwork();
		console.log("🔍 Checking contract at:", { address, chainId: Number(network.chainId) });
		
		const code = await provider.getCode(address);
		if (!code || code === "0x") {
			console.log("❌ No contract code found at address:", address);
			console.log("💡 Try running: npx hardhat run scripts/deploy.ts --network localhost");
			return null;
		}
		console.log("✅ Contract found at:", address);
	} catch (error) {
		console.log("❌ Contract check failed:", error);
		return null;
	}
	return new ethers.Contract(address, (crowdfundArtifact as unknown as CrowdfundArtifact).abi, signer);
}

// Backward compatibility
export const getCrowdfundContract = getCrowdfundWriteContract;


// Network helpers
export const HARDHAT_CHAIN_ID_DEC = 31337;
export const HARDHAT_CHAIN_ID_HEX = "0x7A69"; // 31337
export const HARDHAT_RPC_URL = "http://127.0.0.1:8545";

export async function getNetworkInfo(): Promise<{ chainId: string; name: string } | null> {
	try {
		const provider = getBrowserProvider();
		if (!provider) return null;
		const network = await provider.getNetwork();
		return { chainId: `0x${network.chainId.toString(16)}`, name: network.name || "unknown" };
	} catch {
		return null;
	}
}

export async function verifyContractConnection(): Promise<{success: boolean; message: string; details?: unknown}> {
	try {
		console.log("🔍 Verifying contract connection...");
		
		const provider = getBrowserProvider();
		if (!provider) {
			return { success: false, message: "No wallet provider found" };
		}

		const network = await provider.getNetwork();
		const chainId = Number(network.chainId);
		console.log("🌐 Network:", { chainId, name: network.name });

		const address = await getCrowdfundAddress();
		if (!address) {
			return { success: false, message: "No contract address found" };
		}

		console.log("📍 Contract address:", address);

		const code = await provider.getCode(address);
		if (!code || code === "0x") {
			return { 
				success: false, 
				message: `No contract deployed at ${address}`,
				details: { chainId, address, codeLength: code?.length || 0 }
			};
		}

		// Try to create contract instance
		const contract = await getCrowdfundReadContract();
		if (!contract) {
			return { success: false, message: "Failed to create contract instance" };
		}

		// Test a simple read operation
		const campaignCount = await contract.campaignCount();
		console.log("📊 Campaign count:", campaignCount.toString());

		return { 
			success: true, 
			message: "Contract connection successful",
			details: { chainId, address, campaignCount: campaignCount.toString() }
		};

	} catch (error) {
		console.error("❌ Contract verification failed:", error);
		return { 
			success: false, 
			message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			details: { error }
		};
	}
}

export async function switchToLocalhost(): Promise<boolean> {
	if (typeof window === "undefined") return false;
	const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
	if (!eth?.request) return false;
	try {
		console.log("🔄 Switching to localhost network...");
		await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_CHAIN_ID_HEX }] });
		console.log("✅ Switched to localhost network");
		return true;
	} catch (err: unknown) {
		// 4902: Unrecognized chain, try to add
		const code = (err as { code?: number }).code;
		if (code === 4902) {
			try {
				console.log("➕ Adding localhost network to wallet...");
				await eth.request({
					method: "wallet_addEthereumChain",
					params: [
						{
							chainId: HARDHAT_CHAIN_ID_HEX,
							chainName: "Hardhat Localhost",
							nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
							rpcUrls: [HARDHAT_RPC_URL],
						},
					],
				});
				// After adding, switch again
				await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_CHAIN_ID_HEX }] });
				console.log("✅ Added and switched to localhost network");
				return true;
			} catch (addError) {
				console.log("❌ Failed to add localhost network:", addError);
				return false;
			}
		}
		console.log("❌ Failed to switch network:", err);
		return false;
	}
}


