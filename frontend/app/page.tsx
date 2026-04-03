"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getCrowdfundContract, getCrowdfundReadContract, getBrowserProvider } from "@/lib/web3";
import { parseTransactionError, checkBalance } from "@/utils/errorHandler";
import { txToast } from "@/utils/txToast";
import WalletConnect from "@/components/WalletConnect";
import Footer from "@/components/Footer";
import BlockchainInfo from "@/components/BlockchainInfo";
import CampaignCard from "@/components/CampaignCard";
import CreateCampaignModal from "@/components/CreateCampaignModal";
import CampaignDetailModal from "@/components/CampaignDetailModal";
import AddRewardModal from "@/components/AddRewardModal";
import ContributeModal from "@/components/ContributeModal";
import { Toaster, toast } from "react-hot-toast";
import type { Campaign, Reward, UserContribution } from "@/types";
import { getSampleCampaigns } from "@/constants/sampleCampaigns";

// Augment the contribution with a refunded flag for UI
type UIUserContribution = UserContribution & { refunded?: boolean };
// Basic user reward entry for UI
type UserRewardEntry = {
  campaignId: number;
  campaign?: Campaign;
  reward: Reward;
  // Optional helpers
  eligibleAmount?: bigint;
  claimed?: boolean;
  status: 'eligible' | 'missed' | 'claimed';
};

export default function Home() {
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddRewardModalOpen, setIsAddRewardModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'my-contributions' | 'my-campaigns' | 'my-rewards'>('campaigns');
  const [userContributions, setUserContributions] = useState<UIUserContribution[]>([]);
  const [userCreatedCampaigns, setUserCreatedCampaigns] = useState<Campaign[]>([]);
  const [userRewards, setUserRewards] = useState<UserRewardEntry[]>([]);
  const [totalContributed, setTotalContributed] = useState<bigint>(0n);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  
  // Store sample campaigns separately so they don't get regenerated on every load
  const [sampleCampaigns] = useState<Campaign[]>(() => getSampleCampaigns(Math.floor(Date.now() / 1000)));

  // Keep last known non-zero pledged to show after creator claims (if contract zeroes it)
  const [lastKnownPledged, setLastKnownPledged] = useState<Record<number, bigint>>({});

  // Initialize time only on client side to prevent hydration errors
  useEffect(() => {
    setCurrentTime(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load campaigns on mount and when account, tab, or guest mode changes
  // Note: currentTime is NOT in dependencies to prevent infinite refresh
  // Campaigns don't need to reload every second - time updates happen in render
  useEffect(() => {
    if (currentTime > 0) {
      loadCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAccount, activeTab, isGuestMode]);

  async function loadCampaigns() {
    setIsLoading(true);
    try {
      // Always load sample campaigns first (for guest mode and demonstration)
      // Use the stored sample campaigns (with fixed timestamps from initial load)
      const loadedCampaigns: Campaign[] = [...sampleCampaigns];
      const newLastKnown = { ...lastKnownPledged };

      // Try to load real campaigns from contract (if available)
      try {
        const contract = await getCrowdfundReadContract();
        if (contract) {
          const campaignCount = await contract.campaignCount();

          for (let i = 1; i <= Number(campaignCount); i++) {
            try {
              const campaign = await contract.campaigns(i);
              // Track last known non-zero pledged so we can display it even after claim
              if (campaign.pledged && campaign.pledged > 0n) {
                newLastKnown[i] = campaign.pledged;
              }
              const effectivePledged =
                (campaign.pledged === 0n && campaign.claimed && newLastKnown[i] && newLastKnown[i] > 0n)
                  ? newLastKnown[i]
                  : campaign.pledged;

              const campaignData = {
                id: i,
                creator: campaign.creator,
                goal: campaign.goal,
                pledged: effectivePledged,
                startAt: campaign.startAt,
                endAt: campaign.endAt,
                claimed: campaign.claimed,
                metadataURI: campaign.metadataURI,
              };

              // Filter campaigns based on context:
              // 1. For "Browse Campaigns" - show all campaigns (upcoming, active, and ended)
              // 2. For "My Campaigns" - show all campaigns created by the current user
              // 3. For other contexts - show all campaigns
              if (activeTab === 'campaigns') {
                // Show all campaigns in browse section (upcoming, active, ended)
                loadedCampaigns.push(campaignData);
              } else if (activeTab === 'my-campaigns') {
                // Only show campaigns created by current user
                if (userAccount && campaignData.creator.toLowerCase() === userAccount.toLowerCase()) {
                  loadedCampaigns.push(campaignData);
                }
              } else {
                // For dashboard and other contexts, show all campaigns
                loadedCampaigns.push(campaignData);
              }
            } catch (error) {
              console.error(`Failed to load campaign ${i}:`, error);
            }
          }
        }
      } catch (error) {
        // If contract is not available, continue with sample campaigns only
        console.log("Contract not available, showing sample campaigns only");
      }

      setLastKnownPledged(newLastKnown);
      setCampaigns(loadedCampaigns);
    } catch {
      console.error("Failed to load campaigns");
      // Fallback to sample campaigns only (use stored ones with fixed timestamps)
      setCampaigns(sampleCampaigns);
    } finally {
      setIsLoading(false);
    }
  }

  // Helper: best-effort check if a user has refunded for a given campaign
  async function hasUserRefunded(contract: ethers.Contract | null, campaignId: number, user: string): Promise<boolean> {
    if (!contract) return false;
    try {
      if (typeof contract.hasRefunded === 'function') {
        return await contract.hasRefunded(campaignId, user);
      }
    } catch {}
    try {
      if (typeof contract.refunded === 'function') {
        return await contract.refunded(campaignId, user);
      }
    } catch {}
    // Fallback heuristic: if campaign failed and on-chain contribution is 0
    try {
      const contrib: bigint = await contract.getUserContribution(campaignId, user);
      return contrib === 0n;
    } catch {}
    return false;
  }

  // Load all campaigns for user data processing (not filtered by tab)
  const loadAllCampaigns = useCallback(async (): Promise<Campaign[]> => {
    try {
      const contract = await getCrowdfundReadContract();
      if (!contract) return [];

      const campaignCount = await contract.campaignCount();
      const allCampaigns: Campaign[] = [];

      for (let i = 1; i <= Number(campaignCount); i++) {
        try {
          const campaign = await contract.campaigns(i);
          const effectivePledged =
            (campaign.pledged === 0n && campaign.claimed && lastKnownPledged[i] && lastKnownPledged[i] > 0n)
              ? lastKnownPledged[i]
              : campaign.pledged;

          allCampaigns.push({
            id: i,
            creator: campaign.creator,
            goal: campaign.goal,
            pledged: effectivePledged,
            startAt: campaign.startAt,
            endAt: campaign.endAt,
            claimed: campaign.claimed,
            metadataURI: campaign.metadataURI,
          });
        } catch {
          // Skip failed campaigns
        }
      }

      return allCampaigns;
    } catch {
      return [];
    }
  }, [lastKnownPledged]);

  const loadUserData = useCallback(async () => {
    if (!userAccount || typeof userAccount !== 'string') return;
    
    setIsLoadingUserData(true);
    
    try {
      const contract = await getCrowdfundReadContract();
      if (!contract) return;

      // Load all campaigns for user data processing
      const allCampaigns = await loadAllCampaigns();

      // Load total contributed
      const total = await contract.totalContributed(userAccount);
      setTotalContributed(total);

      // Load user contributions and created campaigns
      const contributions: UIUserContribution[] = [];
      const created: Campaign[] = [];

      for (const campaign of allCampaigns) {
        const contribution: bigint = await contract.getUserContribution(campaign.id, userAccount);

        // Only process campaigns where the user actually contributed
        if (contribution > 0n) {
          // Determine if the campaign failed
          const isFailed = (Number(campaign.endAt) <= currentTime) && (campaign.pledged < campaign.goal);
          // Determine if the user has refunded (only if campaign failed and user contributed)
          const refunded = isFailed ? await hasUserRefunded(contract, campaign.id, userAccount) : false;

          contributions.push({
            campaignId: campaign.id,
            campaign,
            amount: contribution,
            refunded,
          });
        }

        if (campaign.creator.toLowerCase() === userAccount.toLowerCase()) {
          created.push(campaign);
        }
      }

      setUserContributions(contributions);
      setUserCreatedCampaigns(created);

      // Load "My Rewards"
      const rewards: UserRewardEntry[] = [];
      
      // Process rewards based on user contributions and campaign status
      for (const uc of contributions) {
        if (!uc.campaign) continue;
        const cid = uc.campaign.id;
        let campaignRewards: Reward[] | null = null;

        // Try to get campaign rewards
        try {
          if (typeof contract.getRewards === 'function') {
            campaignRewards = await contract.getRewards(cid);
          }
        } catch {}
        if (!campaignRewards) {
          try {
            if (typeof contract.getCampaignRewards === 'function') {
              campaignRewards = await contract.getCampaignRewards(cid);
            }
          } catch {}
        }

        if (Array.isArray(campaignRewards)) {
          for (const rw of campaignRewards) {
            // Check if user meets the minimum contribution threshold
            const reward = rw as Reward;
            const threshold = reward.minimumContribution ?? 0n;
            const minContrib = typeof threshold === 'bigint' ? threshold : BigInt(String(threshold));
            
            if (uc.amount >= minContrib) {
              // Determine reward status based on campaign and user state
              let rewardStatus: 'eligible' | 'missed' | 'claimed' = 'eligible';
              let claimed = false;
              
              // Check if user has already claimed this reward
              try {
                if (typeof contract.isRewardClaimed === 'function') {
                  claimed = await contract.isRewardClaimed(cid, 0, userAccount);
                } else if (typeof contract.rewardClaimed === 'function') {
                  claimed = await contract.rewardClaimed(cid, 0, userAccount);
                }
              } catch {}
              
              if (claimed) {
                rewardStatus = 'claimed';
              } else if (uc.refunded) {
                // User refunded their contribution, so they missed the reward
                rewardStatus = 'missed';
              } else if (uc.campaign.claimed && uc.campaign.pledged >= uc.campaign.goal) {
                // Campaign succeeded and creator withdrew funds - reward is automatically claimed
                rewardStatus = 'claimed';
              } else if (Number(uc.campaign.endAt) <= currentTime && uc.campaign.pledged < uc.campaign.goal) {
                // Campaign failed (goal not met after end) - user missed the reward
                rewardStatus = 'missed';
              } else {
                // Campaign is still active or succeeded but not yet withdrawn - reward is eligible
                rewardStatus = 'eligible';
              }
              
              rewards.push({
                campaignId: cid,
                campaign: uc.campaign,
                reward: rw,
                eligibleAmount: uc.amount,
                claimed,
                status: rewardStatus,
              });
            }
          }
        }
      }

      setUserRewards(rewards);
    } catch {
      console.error("Failed to load user data");
    } finally {
      setIsLoadingUserData(false);
    }
  }, [userAccount, campaigns, currentTime, loadAllCampaigns]);

  // Load user data after campaigns are loaded
  useEffect(() => {
    if (userAccount) {
      loadUserData();
    }
  }, [userAccount, activeTab, loadUserData]);

  function getCampaignStatus(campaign: Campaign, time: number): 'upcoming' | 'active' | 'success' | 'failed' {
    if (time < Number(campaign.startAt)) return 'upcoming';
    if (time < Number(campaign.endAt)) return 'active';
    if (campaign.pledged >= campaign.goal) return 'success';
    return 'failed';
  }

   // Creator-side status: show "Claimed" if withdrawn
  function getCreatorStatus(campaign: Campaign, time: number): 'claimed' | 'upcoming' | 'active' | 'success' | 'failed' {
    if (campaign.claimed) return 'claimed';
    return getCampaignStatus(campaign, time);
  }

  // Contributor-side status with "Done" and "Refunded"
  function getContributorStatus(entry: UIUserContribution, time: number): 'done' | 'refunded' | 'upcoming' | 'active' | 'success' | 'failed' {
    const c = entry.campaign;
    if (!c) return 'failed';
    if (c.claimed) return 'done';
    const base = getCampaignStatus(c, time);
    if (base === 'failed' && entry.refunded) return 'refunded';
    return base;
  }

  // Countdown utility functions
  function getTimeRemaining(targetTime: number): { days: number; hours: number; minutes: number; seconds: number; total: number } {
    const total = Math.max(0, targetTime - currentTime);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return { days, hours, minutes, seconds, total };
  }


  async function handleCreateCampaign(goal: bigint, startAt: number, endAt: number, metadataURI: string) {
    try {
      const contract = await getCrowdfundContract();
      if (!contract) {
        throw new Error("Contract not available - please check if contract is deployed and wallet is connected");
      }

      // Check balance for gas
      const provider = getBrowserProvider();
      if (userAccount && provider) {
        const balanceCheck = await checkBalance(0n, userAccount, provider);
        if (!balanceCheck.sufficient && balanceCheck.balance < balanceCheck.needed) {
          const shortfallEth = ethers.formatEther(balanceCheck.shortfall);
          toast.error(`Insufficient funds for gas fees. You need at least ${shortfallEth} more ETH to cover transaction fees.`, { duration: 6000 });
          return;
        }
      }

      // Preflight: estimate gas to catch reverts early with clearer reason
      try {
        await contract.createCampaign.estimateGas(goal, startAt, endAt, metadataURI);
      } catch (err: unknown) {
        const parsed = parseTransactionError(err);
        toast.error(parsed.userFriendly, { duration: 6000 });
        return;
      }

      await txToast(
        () => contract.createCampaign(goal, startAt, endAt, metadataURI),
        {
          pending:    "Waiting for wallet confirmation...",
          confirming: "Creating your campaign on-chain...",
          success:    "Campaign created successfully!",
          error:      "Failed to create campaign.",
        }
      );

      await new Promise(r => setTimeout(r, 800));
      await loadCampaigns();
      await loadUserData();
      setActiveTab('my-campaigns');
    } catch (error: unknown) {
      const parsed = parseTransactionError(error);
      // only show if txToast hasn't already shown one
      if ((error as { code?: number })?.code !== 4001) {
        toast.error(parsed.userFriendly, { duration: 6000 });
      }
    }
  }

  async function handleAddReward(campaignId: number, title: string, description: string, minContribution: bigint, quantity: bigint) {
    try {
      const contract = await getCrowdfundContract();
      if (!contract) throw new Error("Contract not available");

      const provider = getBrowserProvider();
      if (userAccount && provider) {
        const balanceCheck = await checkBalance(0n, userAccount, provider);
        if (!balanceCheck.sufficient && balanceCheck.balance < balanceCheck.needed) {
          const shortfallEth = ethers.formatEther(balanceCheck.shortfall);
          toast.error(`Insufficient funds for gas fees. You need at least ${shortfallEth} more ETH to cover transaction fees.`, { duration: 6000 });
          return;
        }
      }

      try {
        await contract.addReward.estimateGas(campaignId, title, description, minContribution, quantity);
      } catch (estimateError: unknown) {
        const parsed = parseTransactionError(estimateError);
        toast.error(parsed.userFriendly, { duration: 6000 });
        return;
      }

      await txToast(
        () => contract.addReward(campaignId, title, description, minContribution, quantity),
        {
          pending:    "Waiting for wallet confirmation...",
          confirming: "Adding reward tier on-chain...",
          success:    "Reward added successfully!",
          error:      "Failed to add reward.",
        }
      );

      setIsAddRewardModalOpen(false);
    } catch (error: unknown) {
      const parsed = parseTransactionError(error);
      if ((error as { code?: number })?.code !== 4001) {
        toast.error(parsed.userFriendly, { duration: 6000 });
      }
    }
  }


  function handleCampaignSelect(campaign: Campaign) {
    setSelectedCampaign(campaign);
    setIsDetailModalOpen(true);
  }

  function handleContributeFromCard(campaign: Campaign) {
    setSelectedCampaign(campaign);
    setIsContributeModalOpen(true);
  }

  async function handleWithdrawFromCard(campaign: Campaign) {
    const contract = await getCrowdfundContract();
    if (!contract) { toast.error("Contract not available"); return; }
    const provider = getBrowserProvider();
    if (userAccount && provider) {
      const { checkBalance } = await import("@/utils/errorHandler");
      const bc = await checkBalance(0n, userAccount, provider);
      if (!bc.sufficient && bc.balance < bc.needed) {
        toast.error(`Insufficient gas funds. Need ${ethers.formatEther(bc.shortfall)} more ETH.`, { duration: 5000 });
        return;
      }
    }
    try { await contract.withdraw.estimateGas(campaign.id); }
    catch (e) { const { parseTransactionError } = await import("@/utils/errorHandler"); toast.error(parseTransactionError(e).userFriendly, { duration: 6000 }); return; }
    try {
      await txToast(() => contract.withdraw(campaign.id), {
        pending: "Waiting for wallet confirmation...", confirming: "Withdrawing funds on-chain...",
        success: "Withdrawal successful!", error: "Withdrawal failed.",
      });
      await loadCampaigns(); await loadUserData();
    } catch {}
  }

  async function handleRefundFromCard(campaign: Campaign) {
    const contract = await getCrowdfundContract();
    if (!contract) { toast.error("Contract not available"); return; }
    const provider = getBrowserProvider();
    if (userAccount && provider) {
      const { checkBalance } = await import("@/utils/errorHandler");
      const bc = await checkBalance(0n, userAccount, provider);
      if (!bc.sufficient && bc.balance < bc.needed) {
        toast.error(`Insufficient gas funds. Need ${ethers.formatEther(bc.shortfall)} more ETH.`, { duration: 5000 });
        return;
      }
    }
    try { await contract.refund.estimateGas(campaign.id); }
    catch (e) { const { parseTransactionError } = await import("@/utils/errorHandler"); toast.error(parseTransactionError(e).userFriendly, { duration: 6000 }); return; }
    try {
      await txToast(() => contract.refund(campaign.id), {
        pending: "Waiting for wallet confirmation...", confirming: "Processing your refund on-chain...",
        success: "Refund successful!", error: "Refund failed.",
      });
      await loadCampaigns(); await loadUserData();
    } catch {}
  }

  async function handleContributeSubmit(campaign: Campaign, amountEth: string) {
    const contract = await getCrowdfundContract();
    if (!contract) throw new Error("Contract not available");

    const provider = getBrowserProvider();
    if (userAccount && provider) {
      const amount = ethers.parseEther(amountEth);
      const balanceCheck = await checkBalance(amount, userAccount, provider);
      if (!balanceCheck.sufficient) {
        const { toast } = await import("react-hot-toast");
        toast.error(
          `Insufficient funds. You need ${ethers.formatEther(balanceCheck.needed)} ETH but only have ${ethers.formatEther(balanceCheck.balance)} ETH.`,
          { duration: 6000 }
        );
        throw new Error("Insufficient funds");
      }
    }

    const amount = ethers.parseEther(amountEth);
    const rewardIndex = Number.MAX_SAFE_INTEGER; // no reward selected from card

    try {
      await contract.pledge.estimateGas(campaign.id, rewardIndex, { value: amount });
    } catch (estimateError: unknown) {
      const { parseTransactionError: pte } = await import("@/utils/errorHandler");
      const { toast } = await import("react-hot-toast");
      const parsed = pte(estimateError);
      toast.error(parsed.userFriendly, { duration: 6000 });
      throw estimateError;
    }

    const { txToast: tt } = await import("@/utils/txToast");
    await tt(
      () => contract.pledge(campaign.id, rewardIndex, { value: amount }),
      {
        pending:    "Waiting for wallet confirmation...",
        confirming: "Confirming your contribution on-chain...",
        success:    "Contribution successful!",
        error:      "Contribution failed.",
      }
    );

    await loadCampaigns();
    await loadUserData();
  }

  function handleWalletConnect(account: string, balance: string) {
    console.log("Connecting wallet:", account, typeof account);
    setUserAccount(account);
    setUserBalance(balance);
  }

  function handleWalletDisconnect() {
    setUserAccount(null);
    setUserBalance("0");
    setUserContributions([]);
    setUserCreatedCampaigns([]);
    setUserRewards([]);
    setTotalContributed(0n);
    setSidebarOpen(false);
    setLastKnownPledged({});
    setIsGuestMode(false);
    // Keep campaigns loaded (sample + real campaigns)
    loadCampaigns();
  }

  function handleGuestMode() {
    setIsGuestMode(true);
    setActiveTab('campaigns');
    loadCampaigns();
  }

  // Stats summary calculations (used by campaigns view)
  const totalCampaignsCount = campaigns.length;
  const activeCampaignsCount = campaigns.filter(c => currentTime >= Number(c.startAt) && currentTime < Number(c.endAt)).length;
  const successfulCampaignsCount = campaigns.filter(c => (c.pledged >= c.goal)).length;
  const totalEthRaisedBigInt = campaigns.reduce((acc, c) => acc + (typeof c.pledged === 'bigint' ? c.pledged : BigInt(String(c.pledged))), 0n);
  const totalEthRaised = ethers.formatEther(totalEthRaisedBigInt);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">

            {/* Logo — only shown when sidebar is not present */}
            <div className={`flex items-center gap-2.5 flex-shrink-0 ${(userAccount || isGuestMode) ? 'lg:hidden' : ''}`}>
              {(userAccount || isGuestMode) && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mr-1"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.82m2.56-5.84a14.98 14.98 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-indigo-600 leading-tight">Crowdfund dApp</p>
                <p className="text-xs text-gray-400 leading-tight">Decentralized Funding</p>
              </div>
            </div>

            {/* Divider — only when logo is visible */}
            <div className={`w-px h-6 bg-gray-200 mx-1 hidden sm:block ${(userAccount || isGuestMode) ? 'lg:hidden' : ''}`} />

            {/* Search bar */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent placeholder-gray-400"
                  readOnly
                />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
              {/* Notification bell */}
              <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors relative">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </button>
              <WalletConnect onConnect={handleWalletConnect} onDisconnect={handleWalletDisconnect} />
            </div>
          </div>
        </div>
      </header>

    <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        {(userAccount || isGuestMode) && (
          <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:transition-none lg:sticky lg:top-14 lg:inset-auto lg:h-[calc(100vh-3.5rem)]`}>
          <div className="h-full flex flex-col">
            {/* Sidebar logo */}
            <div className="px-4 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.82m2.56-5.84a14.98 14.98 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-600 leading-tight">Crowdfund dApp</p>
                  <p className="text-xs text-gray-400 leading-tight">Decentralized Funding Platform</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col py-4 overflow-y-auto">
              <nav className="flex-1 px-3 space-y-0.5">
                  {/* Dashboard */}
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'dashboard'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <svg className="flex-shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </button>

                  {/* Browse Campaigns */}
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'campaigns'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <svg className="flex-shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Browse Campaigns
                  </button>

                  {/* My Contributions */}
                  <button
                    onClick={() => setActiveTab('my-contributions')}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'my-contributions'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <svg className="flex-shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    My Contributions
                    {userContributions.length > 0 && (
                      <span className="ml-auto text-xs font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                        {userContributions.length}
                      </span>
                    )}
                  </button>

                  {/* My Campaigns */}
                  <button
                    onClick={() => setActiveTab('my-campaigns')}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'my-campaigns'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <svg className="flex-shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    My Campaigns
                    {userCreatedCampaigns.length > 0 && (
                      <span className="ml-auto text-xs font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                        {userCreatedCampaigns.length}
                      </span>
                    )}
                  </button>

                  {/* My Rewards */}
                  <button
                    onClick={() => setActiveTab('my-rewards')}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'my-rewards'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <svg className="flex-shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                    </svg>
                    My Rewards
                    {userRewards.length > 0 && (
                      <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        {userRewards.length}
                      </span>
                    )}
                  </button>

                  {/* Create Campaign */}
                  {userAccount && (
                    <div className="pt-3 mt-3 border-t border-gray-100">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <svg className="flex-shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Campaign
                      </button>
                    </div>
                  )}

                  {/* Guest Mode Info */}
                  {isGuestMode && !userAccount && (
                    <div className="pt-3 mt-3 border-t border-gray-100 px-1">
                      <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                        <p className="font-semibold text-blue-700 mb-0.5">Guest Mode</p>
                        <p className="text-blue-500">Connect wallet to create campaigns and contribute</p>
                      </div>
                      <WalletConnect
                        onConnect={handleWalletConnect}
                        onDisconnect={handleWalletDisconnect}
                        externalAccount={userAccount}
                        externalBalance={userBalance}
                      />
                    </div>
                  )}
              </nav>
            </div>
          </div>
        </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* Welcome Section */}
            {!userAccount && !isGuestMode ? (
              <div className="text-center py-12 px-4">
                <h2 className="text-3xl font-bold text-black mb-4">Welcome to Crowdfund dApp</h2>
                <p className="text-lg text-black mb-8 max-w-2xl mx-auto">
                  Explore campaigns, contribute to projects, and bring ideas to life. Connect your wallet to create and manage campaigns, or browse as a guest.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={handleGuestMode}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Continue as Guest
                  </button>
                  <div className="text-gray-500 font-medium">or</div>
                <WalletConnect onConnect={handleWalletConnect} onDisconnect={handleWalletDisconnect} />
                </div>
                {campaigns.length > 0 && (
                  <div className="mt-8">
                    <p className="text-sm text-gray-600 mb-4">Viewing {campaigns.length} sample campaigns</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">


                {/* Tab Content */}
                {(userAccount || isGuestMode) ? (
                  activeTab === 'dashboard' ? (
                    /* Dashboard */
                    <div className="space-y-5">

                      {/* Welcome + Quick Actions */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">
                                {isGuestMode && !userAccount ? 'Guest Mode' : 'Welcome back'}
                              </p>
                              <h2 className="text-base font-semibold text-gray-900">
                                {userAccount && typeof userAccount === 'string'
                                  ? `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`
                                  : 'Guest User'}
                              </h2>
                              {userAccount && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Balance: <span className="font-semibold text-gray-700">{parseFloat(userBalance).toFixed(4)} ETH</span>
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Quick action buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setActiveTab('campaigns')}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              Browse
                            </button>
                            {userAccount && (
                              <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Create Campaign
                              </button>
                            )}
                            {isGuestMode && !userAccount && (
                              <button
                                onClick={() => setIsGuestMode(false)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                Connect Wallet
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Total Contributed", value: `${ethers.formatEther(totalContributed)} ETH`, icon: (<svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>), accent: "bg-indigo-50" },
                          { label: "Campaigns Backed", value: userContributions.length, icon: (<svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), accent: "bg-emerald-50" },
                          { label: "Campaigns Created", value: userCreatedCampaigns.length, icon: (<svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), accent: "bg-purple-50" },
                          { label: "Active Campaigns", value: campaigns.filter(c => currentTime >= Number(c.startAt) && currentTime < Number(c.endAt)).length, icon: (<svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>), accent: "bg-amber-50" },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${stat.accent} flex items-center justify-center flex-shrink-0`}>{stat.icon}</div>
                            <div>
                              <p className="text-xs text-gray-400">{stat.label}</p>
                              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Two-column: Trending + Activity */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Top / Trending Campaigns */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                              </svg>
                              <h3 className="text-sm font-semibold text-gray-700">Trending Campaigns</h3>
                            </div>
                            <button onClick={() => setActiveTab('campaigns')} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
                              View all →
                            </button>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {(() => {
                              const active = campaigns
                                .filter(c => currentTime >= Number(c.startAt) && currentTime < Number(c.endAt))
                                .sort((a, b) => Number(b.pledged) - Number(a.pledged))
                                .slice(0, 3);
                              if (active.length === 0) {
                                return (
                                  <div className="flex flex-col items-center justify-center py-10 text-center px-5">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                                      <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                      </svg>
                                    </div>
                                    <p className="text-xs font-medium text-gray-500">No active campaigns</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Check back soon or create one</p>
                                  </div>
                                );
                              }
                              return active.map((c) => {
                                const pct = Math.min(100, Number(c.pledged) * 100 / Number(c.goal));
                                return (
                                  <button
                                    key={c.id}
                                    onClick={() => handleCampaignSelect(c)}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-600">
                                      #{c.id}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-800 truncate">Campaign #{c.id}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-400 flex-shrink-0">{Math.round(pct)}%</span>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-xs font-semibold text-indigo-600">{ethers.formatEther(c.pledged)} ETH</p>
                                      <p className="text-xs text-gray-400">of {ethers.formatEther(c.goal)}</p>
                                    </div>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
                            </div>
                            {userContributions.length > 3 && (
                              <button onClick={() => setActiveTab('my-contributions')} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
                                View all →
                              </button>
                            )}
                          </div>
                          <div className="divide-y divide-gray-50">
                            {userContributions.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 text-center px-5">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                                  <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p className="text-xs font-medium text-gray-500">No activity yet</p>
                                <p className="text-xs text-gray-400 mt-0.5">Your contributions will appear here</p>
                              </div>
                            ) : (
                              userContributions.slice(0, 4).map((contribution) => {
                                const status = getContributorStatus(contribution, currentTime);
                                const statusStyles: Record<string, string> = {
                                  done: 'bg-emerald-50 text-emerald-700', refunded: 'bg-amber-50 text-amber-700',
                                  success: 'bg-blue-50 text-blue-700', failed: 'bg-red-50 text-red-600',
                                  upcoming: 'bg-gray-100 text-gray-500', active: 'bg-indigo-50 text-indigo-700',
                                };
                                const statusLabel: Record<string, string> = {
                                  done: 'Funded', refunded: 'Refunded', success: 'Success',
                                  failed: 'Failed', upcoming: 'Pending', active: 'Active',
                                };
                                return (
                                  <div key={contribution.campaignId} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-800">Campaign #{contribution.campaignId}</p>
                                      <p className="text-xs text-gray-400">{ethers.formatEther(contribution.amount)} ETH contributed</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusStyles[status] ?? 'bg-gray-100 text-gray-500'}`}>
                                      {statusLabel[status] ?? status}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Blockchain Info */}
                      <BlockchainInfo userAddress={userAccount} userBalance={userBalance} />

                    </div>
                  ) : activeTab === 'campaigns' ? (
                  /* Campaigns Grid */
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-black">All Campaigns</h3>
                      <button
                        onClick={loadCampaigns}
                        disabled={isLoading}
                        className="px-3 py-1 text-sm bg-blue-500 text-white-700 rounded-md hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isLoading ? "Loading..." : "⟳ Refresh"}
                      </button>
                    </div>

                    {/* Stats summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Total Campaigns</div>
                        <div className="mt-2 text-2xl font-semibold text-gray-900">{totalCampaignsCount}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Active Campaigns</div>
                        <div className="mt-2 text-2xl font-semibold text-gray-900">{activeCampaignsCount}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Total ETH Raised</div>
                        <div className="mt-2 text-2xl font-semibold text-gray-900">{totalEthRaised} ETH</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Successful Campaigns</div>
                        <div className="mt-2 text-2xl font-semibold text-gray-900">{successfulCampaignsCount}</div>
                      </div>
                    </div>

                    {campaigns.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg shadow">
                        <p className="text-black">No campaigns found. Create the first one!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((campaign) => (
                          <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            currentTime={currentTime}
                            onSelect={handleCampaignSelect}
                            onContribute={handleContributeFromCard}
                            onWithdraw={handleWithdrawFromCard}
                            onRefund={handleRefundFromCard}
                            userAddress={userAccount && typeof userAccount === 'string' ? userAccount : undefined}
                            userContribution={userContributions.find(c => c.campaignId === campaign.id)?.amount ?? 0n}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  ) : activeTab === 'my-contributions' ? (
                    /* My Contributions */
                    <div className="space-y-5">

                      {/* Summary card — only when there's data */}
                      {userContributions.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium">Total Contributed</p>
                              <p className="text-xl font-bold text-gray-900">{ethers.formatEther(totalContributed)} ETH</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium">Campaigns Supported</p>
                              <p className="text-xl font-bold text-gray-900">{userContributions.length}</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium">Rewards Earned</p>
                              <p className="text-xl font-bold text-gray-900">{userRewards.length}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Table card */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700">My Contributions</h3>
                          {userContributions.length > 0 && (
                            <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                              {userContributions.length} campaign{userContributions.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        {isLoadingUserData ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                            <span className="text-sm text-gray-400">Loading contributions...</span>
                          </div>
                        ) : userContributions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center py-14 px-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                              <svg className="w-7 h-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">No contributions yet</p>
                            <p className="text-xs text-gray-400 mb-4 max-w-xs">You haven&apos;t contributed to any campaigns. Browse active campaigns and support an idea you believe in.</p>
                            <button
                              onClick={() => setActiveTab('campaigns')}
                              className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Browse Campaigns
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Campaign</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Goal</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pledged</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">My Contribution</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {userContributions.map((contribution) => {
                                  const status = getContributorStatus(contribution, currentTime);
                                  const isEnded = currentTime > Number(contribution.campaign.endAt);
                                  const isGoalMet = contribution.campaign.pledged >= contribution.campaign.goal;
                                  const canRefund = isEnded && !isGoalMet && !contribution.refunded;
                                  const hasReward = userRewards.some(r => r.campaignId === contribution.campaignId);

                                  const statusConfig: Record<string, { label: string; classes: string }> = {
                                    done:     { label: "Funded",      classes: "bg-emerald-50 text-emerald-700" },
                                    refunded: { label: "Refunded",    classes: "bg-gray-100 text-gray-500" },
                                    success:  { label: "Success",     classes: "bg-blue-50 text-blue-700" },
                                    failed:   { label: "Failed",      classes: "bg-red-50 text-red-600" },
                                    upcoming: { label: "Not Started", classes: "bg-amber-50 text-amber-700" },
                                    active:   { label: "Active",      classes: "bg-indigo-50 text-indigo-700" },
                                  };
                                  const sc = statusConfig[status] ?? { label: status, classes: "bg-gray-100 text-gray-500" };

                                  return (
                                    <tr key={contribution.campaignId} className="hover:bg-gray-50 transition-colors">
                                      {/* Campaign */}
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-600">
                                            #{contribution.campaignId}
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-800">Campaign #{contribution.campaignId}</p>
                                            <p className="text-xs text-gray-400">
                                              {contribution.campaign.creator
                                                ? `${contribution.campaign.creator.slice(0, 6)}...${contribution.campaign.creator.slice(-4)}`
                                                : "Unknown creator"}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      {/* Goal */}
                                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                        {ethers.formatEther(contribution.campaign.goal)} ETH
                                      </td>
                                      {/* Total Pledged */}
                                      <td className="px-6 py-4">
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">{ethers.formatEther(contribution.campaign.pledged)} ETH</p>
                                          <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
                                            <div
                                              className="h-1.5 rounded-full bg-indigo-400"
                                              style={{ width: `${Math.min(100, Number(contribution.campaign.pledged) * 100 / Number(contribution.campaign.goal))}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>
                                      {/* My Contribution */}
                                      <td className="px-6 py-4 text-sm font-semibold text-indigo-600">
                                        {ethers.formatEther(contribution.amount)} ETH
                                      </td>
                                      {/* Status */}
                                      <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${sc.classes}`}>
                                          {sc.label}
                                        </span>
                                      </td>
                                      {/* Actions */}
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleCampaignSelect(contribution.campaign)}
                                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                                          >
                                            View Details
                                          </button>
                                          {canRefund && (
                                            <button
                                              onClick={() => handleCampaignSelect(contribution.campaign)}
                                              className="px-3 py-1.5 text-xs font-semibold text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                                            >
                                              Claim Refund
                                            </button>
                                          )}
                                          {hasReward && (
                                            <button
                                              onClick={() => setActiveTab('my-rewards')}
                                              className="px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                                            >
                                              View Reward
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : activeTab === 'my-campaigns' ? (
                    /* My Campaigns */
                    <div className="space-y-5">

                      {/* Summary cards — only when there's data */}
                      {userCreatedCampaigns.length > 0 && (() => {
                        const activeCnt = userCreatedCampaigns.filter(c => currentTime >= Number(c.startAt) && currentTime < Number(c.endAt)).length;
                        const successCnt = userCreatedCampaigns.filter(c => c.pledged >= c.goal).length;
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-medium">Total Created</p>
                                <p className="text-xl font-bold text-gray-900">{userCreatedCampaigns.length}</p>
                              </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-medium">Active Now</p>
                                <p className="text-xl font-bold text-gray-900">{activeCnt}</p>
                              </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-medium">Successful</p>
                                <p className="text-xl font-bold text-gray-900">{successCnt}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Table card */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700">My Created Campaigns</h3>
                          {userAccount && (
                            <button
                              onClick={() => setIsCreateModalOpen(true)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              New Campaign
                            </button>
                          )}
                        </div>

                        {userCreatedCampaigns.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center py-14 px-6">
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                              <svg className="w-7 h-7 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">No campaigns created</p>
                            <p className="text-xs text-gray-400 mb-4 max-w-xs">You haven&apos;t created any campaigns yet. Launch your first campaign and start raising funds.</p>
                            <button
                              onClick={() => setIsCreateModalOpen(true)}
                              className="px-4 py-2 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              Create Campaign
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Campaign</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Goal</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pledged</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {userCreatedCampaigns.map((campaign) => {
                                  const status = getCreatorStatus(campaign, currentTime);
                                  const isUpcoming = currentTime < Number(campaign.startAt);
                                  const isActive = currentTime >= Number(campaign.startAt) && currentTime < Number(campaign.endAt);
                                  const isEnded = currentTime > Number(campaign.endAt);
                                  const isGoalMet = campaign.pledged >= campaign.goal;
                                  const canWithdraw = isEnded && isGoalMet && !campaign.claimed;
                                  const canAddReward = isUpcoming;
                                  const progressPct = Math.min(100, Number(campaign.pledged) * 100 / Number(campaign.goal));

                                  const statusConfig: Record<string, { label: string; classes: string }> = {
                                    claimed:  { label: "Withdrawn",   classes: "bg-emerald-50 text-emerald-700" },
                                    success:  { label: "Goal Met",    classes: "bg-blue-50 text-blue-700" },
                                    failed:   { label: "Failed",      classes: "bg-red-50 text-red-600" },
                                    upcoming: { label: "Not Started", classes: "bg-amber-50 text-amber-700" },
                                    active:   { label: "Active",      classes: "bg-indigo-50 text-indigo-700" },
                                  };
                                  const sc = statusConfig[status] ?? { label: status, classes: "bg-gray-100 text-gray-500" };

                                  return (
                                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                                      {/* Campaign */}
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-purple-600">
                                            #{campaign.id}
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-800">Campaign #{campaign.id}</p>
                                            <p className="text-xs text-gray-400">
                                              {isActive ? "Ends " + new Date(Number(campaign.endAt) * 1000).toLocaleDateString() :
                                               isUpcoming ? "Starts " + new Date(Number(campaign.startAt) * 1000).toLocaleDateString() :
                                               "Ended " + new Date(Number(campaign.endAt) * 1000).toLocaleDateString()}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      {/* Goal */}
                                      <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                        {ethers.formatEther(campaign.goal)} ETH
                                      </td>
                                      {/* Pledged */}
                                      <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-gray-700">{ethers.formatEther(campaign.pledged)} ETH</p>
                                        <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
                                          <div
                                            className={`h-1.5 rounded-full ${isGoalMet ? "bg-emerald-400" : "bg-indigo-400"}`}
                                            style={{ width: `${progressPct}%` }}
                                          />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">{Math.round(progressPct)}%</p>
                                      </td>
                                      {/* Status */}
                                      <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${sc.classes}`}>
                                          {sc.label}
                                        </span>
                                      </td>
                                      {/* Actions */}
                                      <td className="px-6 py-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {/* View Details */}
                                          <button
                                            onClick={() => handleCampaignSelect(campaign)}
                                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                                          >
                                            View Details
                                          </button>
                                          {/* Add Reward */}
                                          {canAddReward && (
                                            <button
                                              onClick={() => { setSelectedCampaign(campaign); setIsAddRewardModalOpen(true); }}
                                              className="px-3 py-1.5 text-xs font-semibold text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                                            >
                                              Add Reward
                                            </button>
                                          )}
                                          {/* Withdraw */}
                                          {canWithdraw && (
                                            <button
                                              onClick={() => handleCampaignSelect(campaign)}
                                              className="px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                                            >
                                              Withdraw
                                            </button>
                                          )}
                                          {/* Copy Link */}
                                          <button
                                            onClick={() => {
                                              navigator.clipboard.writeText(`${window.location.origin}?campaign=${campaign.id}`);
                                              import('react-hot-toast').then(({ toast }) => toast.success("Campaign link copied!"));
                                            }}
                                            className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            title="Copy campaign link"
                                          >
                                            Copy Link
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : activeTab === 'my-rewards' ? (
                    /* My Rewards */
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                            </svg>
                            <h3 className="text-sm font-semibold text-gray-700">My Rewards</h3>
                          </div>
                          {userRewards.length > 0 && (
                            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                              {userRewards.length} reward{userRewards.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="p-5">
                          {isLoadingUserData ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                              <span className="text-sm text-gray-400">Loading rewards...</span>
                            </div>
                          ) : userRewards.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                                </svg>
                              </div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">No rewards yet</p>
                              <p className="text-xs text-gray-400 mb-4 max-w-xs">Contribute to campaigns with reward tiers to earn rewards. The more you contribute, the better the rewards.</p>
                              <button
                                onClick={() => setActiveTab('campaigns')}
                                className="px-4 py-2 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                              >
                                Browse Campaigns
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {userRewards.map((ur, idx) => {
                                const statusConfig = {
                                  claimed: { label: "Claimed",  classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                                  missed:  { label: "Missed",   classes: "bg-red-50 text-red-600 border-red-200" },
                                  eligible:{ label: "Eligible", classes: "bg-amber-50 text-amber-700 border-amber-200" },
                                }[ur.status] ?? { label: ur.status, classes: "bg-gray-100 text-gray-500 border-gray-200" };

                                return (
                                  <div
                                    key={`${ur.campaignId}-${ur.reward.title}-${ur.reward.minimumContribution}-${idx}`}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3"
                                  >
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-xs text-gray-400 font-medium mb-0.5">Campaign #{ur.campaignId}</p>
                                        <p className="text-sm font-semibold text-gray-900">{ur.reward.title}</p>
                                      </div>
                                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig.classes}`}>
                                        {statusConfig.label}
                                      </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-gray-500 leading-relaxed">{ur.reward.description}</p>

                                    {/* Stats row */}
                                    <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                                      <div className="flex-1">
                                        <p className="text-xs text-gray-400">Min required</p>
                                        <p className="text-xs font-semibold text-indigo-600">{ethers.formatEther(ur.reward.minimumContribution)} ETH</p>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs text-gray-400">Your contribution</p>
                                        <p className="text-xs font-semibold text-gray-800">{ethers.formatEther(ur.eligibleAmount ?? 0n)} ETH</p>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs text-gray-400">Availability</p>
                                        <p className="text-xs font-semibold text-gray-800">
                                          {ur.reward.quantityAvailable === 0n
                                            ? "Unlimited"
                                            : `${Number(ur.reward.claimedCount)}/${Number(ur.reward.quantityAvailable)}`}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Eligible hint */}
                                    {ur.status === 'eligible' && (
                                      <p className="text-xs text-amber-600 italic">
                                        {ur.campaign && Number(ur.campaign.endAt || 0) <= currentTime && ur.campaign.pledged >= ur.campaign.goal
                                          ? "Waiting for creator to withdraw"
                                          : "Will auto-claim when campaign succeeds"}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-black">Please connect your wallet to view dashboard</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCampaign}
      />

      <ContributeModal
        isOpen={isContributeModalOpen}
        campaign={selectedCampaign}
        onClose={() => { setIsContributeModalOpen(false); setSelectedCampaign(null); }}
        onContribute={handleContributeSubmit}
      />

      <AddRewardModal
        isOpen={isAddRewardModalOpen}
        onClose={() => setIsAddRewardModalOpen(false)}
        campaign={selectedCampaign}
        onAddReward={handleAddReward}
      />

      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCampaign(null);
        }}
        currentTime={currentTime}
        userAddress={userAccount && typeof userAccount === 'string' ? userAccount : undefined}
        isGuestMode={isGuestMode && !userAccount}
        onRefresh={() => {
          loadCampaigns();
          loadUserData();
        }}
        onRequestWalletConnect={() => {
          // Exit guest mode and trigger wallet connection
          setIsGuestMode(false);
          // The WalletConnect component in the header will handle the actual connection
          // We can also manually trigger it if needed
          if (typeof window !== 'undefined' && (window as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum) {
            const ethereum = (window as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
            if (ethereum) {
              ethereum.request({ method: 'eth_requestAccounts' }).then(() => {
                // Connection will be handled by WalletConnect component via event listeners
              }).catch((err: unknown) => {
                console.error("Failed to connect:", err);
              });
            }
          }
        }}
      />

      {/* Mobile sidebar overlay */}
      {(userAccount || isGuestMode) && sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Footer />
    </div>
  );
}
