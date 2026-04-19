"use client";
import { useState, useEffect, useRef } from "react";
import { getUserDisplayName } from "@/utils/userMapping";
import { ethers } from "ethers";
import type { Campaign } from "@/types";

interface CampaignCardProps {
  campaign: Campaign;
  currentTime: number;
  onSelect: (campaign: Campaign) => void;
  onContribute?: (campaign: Campaign) => void;
  onWithdraw?: (campaign: Campaign) => void;
  onRefund?: (campaign: Campaign) => void;
  userAddress?: string;
  userContribution?: bigint;
}

export default function CampaignCard({ campaign, currentTime, onSelect, onContribute, onWithdraw, onRefund, userAddress, userContribution = 0n }: CampaignCardProps) {
  const [mounted, setMounted] = useState(false);
  // Own internal timer — updates every second without depending on parent re-renders
  const [tick, setTick] = useState(0);
  const timeRef = useRef(Math.floor(Date.now() / 1000));

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      timeRef.current = Math.floor(Date.now() / 1000);
      setTick(t => t + 1); // minimal re-render just for this card's countdown
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 animate-pulse max-w-md w-full">
        <div className="h-40 bg-gray-200 rounded-t-lg"></div>
        <div className="p-6">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-3 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  // Use own internal time — no dependency on parent currentTime prop
  const timeToUse = timeRef.current;
  const isNotStarted = timeToUse < Number(campaign.startAt);
  const isActive = timeToUse >= Number(campaign.startAt) && timeToUse <= Number(campaign.endAt);
  const isEnded = timeToUse > Number(campaign.endAt);
  const isGoalMet = campaign.pledged >= campaign.goal;
  const progress = Number(campaign.pledged) / Number(campaign.goal);
  
  const getStatusBadge = () => {
    if (isNotStarted) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Starting Soon</span>;
    }
    if (isActive) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span>;
    }
    if (isEnded) {
      if (isGoalMet) {
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Goal Met</span>;
      }
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Goal Not Met</span>;
    }
    return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
  };

  const getTimeLeft = () => {
    if (isEnded) {
      return "Ended";
    }
    if (isNotStarted) {
      const timeLeft = Number(campaign.startAt) - timeToUse;
      if (timeLeft <= 0) return "Starting now...";
      if (timeLeft < 60) return `⏰ Starts in ${timeLeft}s`;
      if (timeLeft < 3600) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `⏰ Starts in ${minutes}m ${seconds}s`;
      }
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      return `⏰ Starts in ${hours}h ${minutes}m`;
    }
    if (isActive) {
      const timeLeft = Number(campaign.endAt) - timeToUse;
      if (timeLeft <= 0) return "Ending now...";
      if (timeLeft < 60) return `⏳ Ends in ${timeLeft}s`;
      if (timeLeft < 3600) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `⏳ Ends in ${minutes}m ${seconds}s`;
      }
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      return `⏳ Ends in ${hours}h ${minutes}m`;
    }
    return "Unknown";
  };

  const isCreator = userAddress && typeof userAddress === 'string' && 
    userAddress.toLowerCase() === campaign.creator.toLowerCase();

  // Action conditions
  const canWithdraw = !!isCreator && isEnded && isGoalMet && !campaign.claimed;
  const canRefund   = !isCreator && isEnded && !isGoalMet && userContribution > 0n;
  const alreadyWithdrawn = !!isCreator && campaign.claimed;

  return (
    <div
      className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(campaign)}
    >
      {/* Top image / media placeholder */}
      <div className="h-40 bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full h-full object-cover flex items-center justify-center">
            {campaign.metadataURI && campaign.metadataURI.startsWith('http') ? (
              <a
                href={campaign.metadataURI}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full h-full flex items-center justify-center text-sm text-indigo-700 hover:text-indigo-900"
              >
                View Project Details
              </a>
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h3.28a2 2 0 011.789 1.106L12 9l1.883-2.894A2 2 0 0115.672 5H19a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <div className="mt-2 text-sm font-medium text-gray-600">No preview available</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 pr-3">
            <h3 className="text-lg font-semibold text-gray-900">Campaign {campaign.id}</h3>
            {campaign.metadataURI && !campaign.metadataURI.startsWith('http') && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{campaign.metadataURI}</p>
            )}
          </div>
          <div className="shrink-0">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-800 shadow-sm">
              {getStatusBadge()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Goal</span>
            <span className="text-sm font-semibold text-gray-900">{ethers.formatEther(campaign.goal)} ETH</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Pledged</span>
            <span className="text-sm font-semibold text-gray-900">{ethers.formatEther(campaign.pledged)} ETH</span>
          </div>
        </div>

        <div className="mb-3">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${isNotStarted ? 'bg-yellow-400' : 'bg-indigo-600'}`}
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-600 font-medium">{isNotStarted ? 'Not started yet' : `${Math.round(progress * 100)}% funded`}</div>
            <div className={`text-xs font-semibold ${isNotStarted ? 'text-yellow-700' : isActive ? 'text-green-700' : 'text-gray-700'}`}>{getTimeLeft()}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Creator: </span>
            <span className="font-semibold text-gray-900">
              {isCreator
                ? 'You'
                : campaign.creator && typeof campaign.creator === 'string'
                ? getUserDisplayName(campaign.creator, userAddress)
                : 'Unknown'}
            </span>
          </div>
          {isCreator && (
            <div className="ml-3 text-xs text-indigo-600 font-medium">👑 You created this campaign</div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 space-y-2">
        {/* Withdraw / Refund — shown when eligible */}
        {canWithdraw && (
          <button
            onClick={(e) => { e.stopPropagation(); onWithdraw?.(campaign); }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Withdraw {ethers.formatEther(campaign.pledged)} ETH
          </button>
        )}
        {canRefund && (
          <button
            onClick={(e) => { e.stopPropagation(); onRefund?.(campaign); }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Claim Refund — {ethers.formatEther(userContribution)} ETH
          </button>
        )}
        {alreadyWithdrawn && (
          <div className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-gray-100 text-xs font-medium text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Funds withdrawn
          </div>
        )}

        {/* Details + Contribute row */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(campaign); }}
            className="flex-1 inline-flex items-center justify-center py-2 px-3 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isActive && onContribute) {
                onContribute(campaign);
              } else {
                onSelect(campaign);
              }
            }}
            className={`flex-1 inline-flex items-center justify-center py-2 px-3 rounded-md text-sm font-semibold text-white transition ${
              isActive
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
            disabled={!isActive}
            title={!isActive ? "Campaign is not active" : "Contribute ETH"}
          >
            Contribute
          </button>
        </div>
      </div>
    </div>
  );
}
