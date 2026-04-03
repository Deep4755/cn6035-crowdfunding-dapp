"use client";
import { useState, useEffect } from "react";
import { getBrowserProvider, getCrowdfundAddress } from "@/lib/web3";
import { ethers } from "ethers";

interface BlockchainInfoProps {
  userAddress?: string | null;
  userBalance?: string;
}

interface ChainInfo {
  chainId: number;
  networkName: string;
  contractAddress: string | undefined;
  isConnected: boolean;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function BlockchainInfo({ userAddress, userBalance }: BlockchainInfoProps) {
  const [chain, setChain] = useState<ChainInfo | null>(null);

  useEffect(() => {
    async function load() {
      const provider = getBrowserProvider();
      if (!provider || !userAddress) {
        setChain({ chainId: 0, networkName: "Not connected", contractAddress: undefined, isConnected: false });
        return;
      }
      try {
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const contractAddress = await getCrowdfundAddress();

        let networkName = "Unknown";
        if (chainId === 11155111) networkName = "Sepolia";
        else if (chainId === 31337 || chainId === 1337) networkName = "Localhost";
        else networkName = network.name || `Chain ${chainId}`;

        setChain({ chainId, networkName, contractAddress, isConnected: true });
      } catch {
        setChain({ chainId: 0, networkName: "Unknown", contractAddress: undefined, isConnected: false });
      }
    }
    load();
  }, [userAddress]);

  const isConnected = !!userAddress && chain?.isConnected;

  const networkColor =
    chain?.networkName === "Sepolia" ? "bg-amber-100 text-amber-700 border-amber-200" :
    chain?.networkName === "Localhost" ? "bg-blue-100 text-blue-700 border-blue-200" :
    "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-700">Blockchain Info</span>
        </div>
        {/* Connection status badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isConnected
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-gray-100 text-gray-500 border-gray-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Wallet */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 font-medium mb-1">Wallet</p>
          <p className="text-xs font-semibold text-gray-800 font-mono truncate">
            {userAddress ? shortAddr(userAddress) : "—"}
          </p>
        </div>

        {/* Balance */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 font-medium mb-1">Balance</p>
          <p className="text-xs font-semibold text-gray-800">
            {userAddress && userBalance
              ? `${parseFloat(userBalance).toFixed(4)} ETH`
              : "—"}
          </p>
        </div>

        {/* Network */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 font-medium mb-1">Network</p>
          {chain?.networkName && chain.networkName !== "Not connected" ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${networkColor}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {chain.networkName}
            </span>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
        </div>

        {/* Contract */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 font-medium mb-1">Contract</p>
          <p className="text-xs font-semibold text-gray-800 font-mono truncate">
            {chain?.contractAddress ? shortAddr(chain.contractAddress) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
