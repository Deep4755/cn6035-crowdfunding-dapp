import { useState, useEffect } from "react";
import { getUserDisplayName } from "@/utils/userMapping";
import { ethers } from "ethers";
import { getCrowdfundContract, getCrowdfundReadContract, getBrowserProvider } from "@/lib/web3";
import { toast } from "react-hot-toast";
import type { Campaign, Reward } from "@/types";
import { parseTransactionError, checkBalance } from "@/utils/errorHandler";
import { txToast } from "@/utils/txToast";

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  userAddress?: string;
  isGuestMode?: boolean;
  onRefresh: () => void;
  onRequestWalletConnect?: () => void;
}

export default function CampaignDetailModal({ 
  campaign, 
  isOpen, 
  onClose, 
  currentTime, 
  userAddress,
  isGuestMode = false,
  onRefresh,
  onRequestWalletConnect
}: CampaignDetailModalProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [contributionAmount, setContributionAmount] = useState("");
  const [selectedReward, setSelectedReward] = useState<number>(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userContribution, setUserContribution] = useState<bigint>(0n);

  useEffect(() => {
    if (campaign && isOpen) {
      async function loadRewards() {
        if (!campaign) return;
        try {
          const contract = await getCrowdfundReadContract();
          if (contract) {
            const campaignRewards = await contract.getRewards(campaign.id);
            setRewards(campaignRewards);
          }
        } catch {}
      }

      async function loadUserContribution() {
        if (!campaign || !userAddress) return;
        try {
          const contract = await getCrowdfundReadContract();
          if (contract) {
            const contribution = await contract.getUserContribution(campaign.id, userAddress);
            setUserContribution(contribution);
          }
        } catch {}
      }

      loadRewards();
      loadUserContribution();
    }
  }, [campaign, isOpen, userAddress]);

  async function handlePledge() {
    if (!campaign || !contributionAmount) return;
    setIsSubmitting(true);
    try {
      const contract = await getCrowdfundContract();
      if (!contract) throw new Error("Contract not available");

      const amount = ethers.parseEther(contributionAmount);

      const provider = getBrowserProvider();
      if (userAddress && provider) {
        const balanceCheck = await checkBalance(amount, userAddress, provider);
        if (!balanceCheck.sufficient) {
          const shortfallEth = ethers.formatEther(balanceCheck.shortfall);
          const balanceEth = ethers.formatEther(balanceCheck.balance);
          const neededEth = ethers.formatEther(balanceCheck.needed);
          toast.error(`Insufficient funds. You need ${neededEth} ETH but only have ${balanceEth} ETH. Add at least ${shortfallEth} more ETH.`, { duration: 6000 });
          return;
        }
      }

      if (selectedReward >= 0 && rewards[selectedReward]) {
        const r = rewards[selectedReward];
        if (amount < r.minimumContribution) {
          toast.error(`Contribution below reward minimum. Minimum is ${ethers.formatEther(r.minimumContribution)} ETH.`);
          return;
        }
        if (r.quantityAvailable > 0n && r.claimedCount >= r.quantityAvailable) {
          toast.error("This reward is sold out. Please select a different reward or contribute without one.");
          return;
        }
      }

      const rewardIndex = selectedReward >= 0 ? selectedReward : Number.MAX_SAFE_INTEGER;

      try {
        await contract.pledge.estimateGas(campaign.id, rewardIndex, { value: amount });
      } catch (estimateError: unknown) {
        const parsed = parseTransactionError(estimateError);
        toast.error(parsed.userFriendly, { duration: 6000 });
        return;
      }

      await txToast(
        () => contract.pledge(campaign.id, rewardIndex, { value: amount }),
        {
          pending:    "Waiting for wallet confirmation...",
          confirming: "Confirming your contribution on-chain...",
          success:    "Contribution successful!",
          error:      "Contribution failed.",
        }
      );

      setContributionAmount("");
      setSelectedReward(-1);
      onRefresh();
      onClose();
    } catch (error: unknown) {
      const parsed = parseTransactionError(error);
      if ((error as { code?: number })?.code !== 4001) {
        toast.error(parsed.userFriendly, { duration: 6000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (!campaign) return;
    setIsSubmitting(true);
    try {
      const contract = await getCrowdfundContract();
      if (!contract) throw new Error("Contract not available");

      const provider = getBrowserProvider();
      if (userAddress && provider) {
        const balanceCheck = await checkBalance(0n, userAddress, provider);
        if (!balanceCheck.sufficient && balanceCheck.balance < balanceCheck.needed) {
          toast.error(`Insufficient funds for gas. You need at least ${ethers.formatEther(balanceCheck.shortfall)} more ETH.`, { duration: 6000 });
          return;
        }
      }

      try {
        await contract.withdraw.estimateGas(campaign.id);
      } catch (estimateError: unknown) {
        const parsed = parseTransactionError(estimateError);
        toast.error(parsed.userFriendly, { duration: 6000 });
        return;
      }

      await txToast(
        () => contract.withdraw(campaign.id),
        {
          pending:    "Waiting for wallet confirmation...",
          confirming: "Withdrawing funds on-chain...",
          success:    "Withdrawal successful!",
          error:      "Withdrawal failed.",
        }
      );

      onRefresh();
      onClose();
    } catch (error: unknown) {
      const parsed = parseTransactionError(error);
      if ((error as { code?: number })?.code !== 4001) {
        toast.error(parsed.userFriendly, { duration: 6000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefund() {
    if (!campaign) return;
    setIsSubmitting(true);
    try {
      const contract = await getCrowdfundContract();
      if (!contract) throw new Error("Contract not available");

      const provider = getBrowserProvider();
      if (userAddress && provider) {
        const balanceCheck = await checkBalance(0n, userAddress, provider);
        if (!balanceCheck.sufficient && balanceCheck.balance < balanceCheck.needed) {
          toast.error(`Insufficient funds for gas. You need at least ${ethers.formatEther(balanceCheck.shortfall)} more ETH.`, { duration: 6000 });
          return;
        }
      }

      try {
        await contract.refund.estimateGas(campaign.id);
      } catch (estimateError: unknown) {
        const parsed = parseTransactionError(estimateError);
        toast.error(parsed.userFriendly, { duration: 6000 });
        return;
      }

      await txToast(
        () => contract.refund(campaign.id),
        {
          pending:    "Waiting for wallet confirmation...",
          confirming: "Processing your refund on-chain...",
          success:    "Refund successful!",
          error:      "Refund failed.",
        }
      );

      onRefresh();
    } catch (error: unknown) {
      const parsed = parseTransactionError(error);
      if ((error as { code?: number })?.code !== 4001) {
        toast.error(parsed.userFriendly, { duration: 6000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !campaign) return null;

  const isNotStarted = currentTime < Number(campaign.startAt);
  const isActive = currentTime >= Number(campaign.startAt) && currentTime <= Number(campaign.endAt);
  const isEnded = currentTime > Number(campaign.endAt);
  const isGoalMet = campaign.pledged >= campaign.goal;
  const isCreator = userAddress && typeof userAddress === 'string' && 
    userAddress.toLowerCase() === campaign.creator.toLowerCase();
  const progress = Number(campaign.pledged) / Number(campaign.goal);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
                             <h2 className="text-2xl font-bold text-black">Campaign {campaign.id}</h2>
              {campaign.metadataURI && (
                <div className="mt-2">
                  {campaign.metadataURI.startsWith('http') ? (
                                         <a 
                       href={campaign.metadataURI} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-indigo-600 hover:text-indigo-800 underline text-lg break-all font-bold bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors inline-block"
                     >
                      Click Here to View the Project Detail.
                     </a>
                  ) : (
                                         <p className="text-lg text-black font-medium leading-relaxed">
                       {campaign.metadataURI}
                     </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Campaign Info */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                                 <h3 className="text-lg font-semibold mb-3 text-black">Campaign Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Goal:</span>
                     <span className="font-bold text-black">{ethers.formatEther(campaign.goal)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Pledged:</span>
                     <span className="font-bold text-black">{ethers.formatEther(campaign.pledged)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Creator:</span>
                     <span className="font-bold text-black">
                       {userAddress && typeof userAddress === 'string' && campaign.creator && typeof campaign.creator === 'string' && userAddress.toLowerCase() === campaign.creator.toLowerCase()
                         ? 'You'
                         : campaign.creator && typeof campaign.creator === 'string' 
                           ? getUserDisplayName(campaign.creator, userAddress)
                           : 'Unknown'}
                     </span>
                  </div>
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      isNotStarted ? 'bg-yellow-100 text-yellow-800' :
                      isActive ? 'bg-green-100 text-green-800' :
                      isEnded && isGoalMet ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {isNotStarted ? 'Starting Soon' :
                       isActive ? (isGoalMet ? 'Active — Goal Met' : 'Active') : 
                       isEnded && isGoalMet ? 'Goal Met' : 'Ended'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        isNotStarted ? 'bg-yellow-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(progress * 100, 100)}%` }}
                    ></div>
                  </div>
                                     <div className="text-center text-sm text-black mt-1 font-bold">
                     {isNotStarted ? 'Not started yet' : `${Math.round(progress * 100)}% funded`}
                   </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                                 <h3 className="text-lg font-semibold mb-3 text-black">Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Start:</span>
                     <span className="text-black font-medium">{new Date(Number(campaign.startAt) * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">End:</span>
                     <span className="text-black font-medium">{new Date(Number(campaign.endAt) * 1000).toLocaleString()}</span>
                  </div>
                  {isNotStarted && (
                    <div className="flex justify-between">
                                             <span className="text-black font-bold">Starts in:</span>
                      <span className="font-medium text-yellow-700">
                        {(() => {
                          const timeLeft = Number(campaign.startAt) - currentTime;
                          if (timeLeft < 60) return `${timeLeft}s`;
                          if (timeLeft < 3600) return `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;
                          const hours = Math.floor(timeLeft / 3600);
                          const minutes = Math.floor((timeLeft % 3600) / 60);
                          return `${hours}h ${minutes}m`;
                        })()}
                      </span>
                    </div>
                  )}
                  {isActive && (
                    <div className="flex justify-between">
                                             <span className="text-black font-bold">Ends in:</span>
                      <span className="font-medium text-green-700">
                        {(() => {
                          const timeLeft = Number(campaign.endAt) - currentTime;
                          if (timeLeft < 60) return `${timeLeft}s`;
                          if (timeLeft < 3600) return `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;
                          const hours = Math.floor(timeLeft / 3600);
                          const minutes = Math.floor((timeLeft % 3600) / 60);
                          return `${hours}h ${minutes}m`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {userContribution > 0n && (
                <div className="bg-blue-50 rounded-lg p-4">
                                     <h3 className="text-lg font-semibold mb-2 text-black">Your Contribution</h3>
                  <div className="text-blue-700 font-medium">
                    {ethers.formatEther(userContribution)} ETH
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions & Rewards */}
            <div className="space-y-6">
              {/* Campaign Status Message */}
              {isNotStarted && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Campaign Not Started Yet</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>This campaign will start soon. You can view the details and prepare your contribution.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contribution Form */}
              {isActive && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-black">Contribute</h3>
                  {isGuestMode ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-black mb-3">
                        <span className="font-semibold">👤 You&apos;re viewing in guest mode.</span> Connect your wallet to contribute to this campaign.
                      </p>
                      <button
                        onClick={() => {
                          if (onRequestWalletConnect) {
                            onRequestWalletConnect();
                          } else {
                            // Fallback: try to connect directly
                            if (typeof window !== 'undefined') {
                              const ethereum = (window as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
                              if (ethereum) {
                                ethereum.request({ method: 'eth_requestAccounts' });
                              }
                            }
                          }
                        }}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        Connect MetaMask
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {isGoalMet && (
                        <p className="text-xs text-green-700">
                          Goal met! You can still contribute until the end time.
                        </p>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-black mb-1 font-bold">
                          Amount (ETH)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={contributionAmount}
                          onChange={(e) => setContributionAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
                          placeholder="0.1"
                        />
                      </div>

                      {rewards.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-black mb-1 font-bold">
                            Select Reward (Optional)
                          </label>
                          <select
                            value={selectedReward}
                            onChange={(e) => setSelectedReward(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
                          >
                            <option value={-1}>No reward</option>
                            {rewards.map((reward, index) => {
                              const soldOut = reward.quantityAvailable > 0n && reward.claimedCount >= reward.quantityAvailable;
                              return (
                                <option key={index} value={index} disabled={soldOut}>
                                  {reward.title} - Min: {ethers.formatEther(reward.minimumContribution)} ETH {soldOut ? "(Sold out)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      <button
                        onClick={handlePledge}
                        disabled={isSubmitting || !contributionAmount}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {isSubmitting ? "Processing..." : "Contribute"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons — Withdraw / Refund */}
              {(() => {
                const canWithdraw = isCreator && isEnded && isGoalMet && !campaign.claimed;
                const canRefund = !isCreator && isEnded && !isGoalMet && userContribution > 0n;
                const alreadyWithdrawn = isCreator && campaign.claimed;

                if (!canWithdraw && !canRefund && !alreadyWithdrawn) return null;

                return (
                  <div className={`rounded-xl border p-4 space-y-3 ${
                    canWithdraw ? 'bg-emerald-50 border-emerald-200' :
                    canRefund   ? 'bg-amber-50 border-amber-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    {/* Withdraw */}
                    {canWithdraw && (
                      <>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-emerald-800">Funds Ready to Withdraw</p>
                            <p className="text-xs text-emerald-700 mt-0.5">
                              Your campaign ended and reached its goal. You can now withdraw{" "}
                              <span className="font-semibold">{ethers.formatEther(campaign.pledged)} ETH</span> to your wallet.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleWithdraw}
                          disabled={isSubmitting}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                              Transaction in progress...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                              Withdraw {ethers.formatEther(campaign.pledged)} ETH
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {/* Already withdrawn */}
                    {alreadyWithdrawn && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Funds have already been withdrawn for this campaign.
                      </div>
                    )}

                    {/* Refund */}
                    {canRefund && (
                      <>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-amber-800">Refund Available</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              This campaign ended without reaching its goal. You can reclaim your{" "}
                              <span className="font-semibold">{ethers.formatEther(userContribution)} ETH</span> contribution.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleRefund}
                          disabled={isSubmitting}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-60 transition-colors"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                              Transaction in progress...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                              </svg>
                              Claim Refund — {ethers.formatEther(userContribution)} ETH
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Rewards Section */}
              {rewards.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                    </svg>
                    Reward Tiers
                    <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{rewards.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {rewards.map((reward, index) => {
                      const soldOut = reward.quantityAvailable > 0n && reward.claimedCount >= reward.quantityAvailable;
                      const unlimited = reward.quantityAvailable === 0n;
                      const remaining = unlimited ? null : Number(reward.quantityAvailable) - Number(reward.claimedCount);
                      return (
                        <div key={index} className={`rounded-xl border p-3 transition-colors ${soldOut ? "bg-gray-50 border-gray-200 opacity-60" : "bg-amber-50 border-amber-100"}`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-800">{reward.title}</p>
                            <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              soldOut ? "bg-gray-200 text-gray-500" : "bg-amber-200 text-amber-800"
                            }`}>
                              {soldOut ? "Sold Out" : unlimited ? "Unlimited" : `${remaining} left`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{reward.description}</p>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                            </svg>
                            Min {ethers.formatEther(reward.minimumContribution)} ETH
                            {!unlimited && (
                              <span className="ml-auto text-gray-400 font-normal">{Number(reward.claimedCount)}/{Number(reward.quantityAvailable)} claimed</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
