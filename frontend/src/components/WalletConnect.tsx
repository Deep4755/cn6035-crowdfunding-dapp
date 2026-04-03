import { useState, useEffect } from "react";
import { getUserDisplayName } from "@/utils/userMapping";
import { ethers } from "ethers";
import { getBrowserProvider } from "@/lib/web3";
import { toast } from "react-hot-toast";

interface WalletConnectProps {
  onConnect: (account: string, balance: string) => void;
  onDisconnect: () => void;
  externalAccount?: string | null;
  externalBalance?: string;
}

export default function WalletConnect({ onConnect, onDisconnect, externalAccount, externalBalance }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");

  // Sync with external account/balance if provided (this ensures header syncs when sidebar connects)
  useEffect(() => {
    if (externalAccount !== undefined) {
      setAccount(externalAccount);
      if (externalAccount && externalBalance !== undefined) {
        setBalance(externalBalance);
      } else if (!externalAccount) {
        setBalance("0");
      }
    }
  }, [externalAccount, externalBalance]);

  useEffect(() => {
    checkConnection();
    // Set up global listener for account changes
    if (typeof window !== "undefined") {
      const ethereum = (window as { ethereum?: { on?: (event: string, callback: (accounts: string[]) => void) => void; removeListener?: (event: string, callback: (accounts: string[]) => void) => void } }).ethereum;
      if (ethereum?.on) {
        const handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length > 0) {
            handleAccountChange(accounts[0]);
          } else {
            handleAccountChange(null);
          }
        };
        ethereum.on("accountsChanged", handleAccountsChanged);
        return () => {
          if (ethereum.removeListener) {
            ethereum.removeListener("accountsChanged", handleAccountsChanged);
          }
        };
      }
    }
  }, []);

  async function checkConnection() {
    const provider = getBrowserProvider();
    if (provider) {
      try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          await handleAccountChange(accounts[0]);
        }
      } catch (error) {
        console.log("No accounts found");
      }
    }
  }

  // Normalize various event payloads to a checksum address string
  async function handleAccountChange(next: unknown) {
    let addr: string | null = null;

    if (Array.isArray(next)) {
      addr = next[0] ?? null;
    } else if (typeof next === "string") {
      addr = next;
    } else if (next && typeof next === "object" && "address" in next) {
      addr = (next as { address: string }).address;
    }

    if (!addr) {
      // Treat as disconnect
      setAccount(null);
      setBalance("0");
      onDisconnect();
      return;
    }

    setAccount(addr);
    const provider = getBrowserProvider();
    if (provider) {
      try {
        const balance = await provider.getBalance(addr);
      const balanceStr = ethers.formatEther(balance);
      setBalance(balanceStr);
        onConnect(addr, balanceStr);
      } catch (error) {
        console.error("Failed to get balance:", error);
        setBalance("0");
      }
    }
  }

  async function connect() {
    setIsConnecting(true);
    const toastId = toast.loading("Waiting for wallet confirmation...", {
      style: { borderRadius: "12px", fontSize: "13px", fontWeight: "500", background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" },
    });
    try {
      const provider = getBrowserProvider();
      if (!provider) {
        toast.error("MetaMask not found. Please install MetaMask.", { id: toastId, duration: 5000 });
        return;
      }

      await provider.send("eth_requestAccounts", []);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        await handleAccountChange(accounts[0]);
      }

      toast.success("Wallet connected!", { id: toastId, duration: 3000,
        style: { borderRadius: "12px", fontSize: "13px", fontWeight: "500", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
      });

      if (typeof window !== "undefined") {
        const ethereum = (window as { ethereum?: { on?: (event: string, callback: (accounts: string[]) => void) => void } }).ethereum;
        if (ethereum?.on) {
          ethereum.on("accountsChanged", (accounts: string[]) => {
            handleAccountChange(accounts);
          });
        }
      }
    } catch (error: unknown) {
      const err = error as { message?: string; code?: number };
      if (err.code === 4001) {
        toast.error("Connection cancelled — you rejected the request.", { id: toastId, duration: 4000,
          style: { borderRadius: "12px", fontSize: "13px", fontWeight: "500", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
        });
      } else {
        toast.error(err.message || "Failed to connect wallet.", { id: toastId, duration: 5000,
          style: { borderRadius: "12px", fontSize: "13px", fontWeight: "500", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }

  async function disconnect() {
     try {
      const provider = getBrowserProvider();
      if (provider?.send) {
        await provider.send("wallet_revokePermissions", [{ eth_accounts: {} }]);
      }
    } catch {
      // Ignore disconnect errors
    } finally {
    setAccount(null);
    setBalance("0");
    onDisconnect();
    }
  }

  // Use external account/balance if provided, otherwise use local state
  const displayAccount = externalAccount !== undefined ? externalAccount : account;
  const displayBalance = externalBalance !== undefined ? externalBalance : balance;

  if (displayAccount) {
    const shortAddress = `${displayAccount.slice(0, 6)}...${displayAccount.slice(-4)}`;
    const ethBalance = parseFloat(displayBalance).toFixed(4);

    return (
      <div className="flex items-center gap-2">
        {/* Connect Wallet styled button showing address */}
        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          {shortAddress}
        </button>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0 cursor-pointer" title={`${ethBalance} ETH`}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M12 14h.01" />
      </svg>
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
