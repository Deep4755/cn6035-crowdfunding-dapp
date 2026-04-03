"use client";
import { useState } from "react";
import { ethers } from "ethers";
import type { Campaign } from "@/types";

interface ContributeModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onContribute: (campaign: Campaign, amount: string) => Promise<void>;
}

export default function ContributeModal({
  campaign,
  isOpen,
  onClose,
  onContribute,
}: ContributeModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !campaign) return null;

  const goalEth    = ethers.formatEther(campaign.goal);
  const pledgedEth = ethers.formatEther(campaign.pledged);
  const progress   = Math.min(100, (Number(campaign.pledged) * 100) / Number(campaign.goal));

  const handleConfirm = async () => {
    setError("");
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter an amount greater than 0 ETH.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onContribute(campaign, amount);
      setAmount("");
      onClose();
    } catch {
      // errors are handled by the parent via txToast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setAmount("");
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Contribute</h2>
              <p className="text-xs text-gray-400">Campaign #{campaign.id}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Campaign summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Goal</span>
              <span className="font-semibold text-gray-800">{goalEth} ETH</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Pledged so far</span>
              <span className="font-semibold text-indigo-600">{pledgedEth} ETH</span>
            </div>
            {/* Progress bar */}
            <div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{Math.round(progress)}% funded</p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Your Contribution <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError("");
                }}
                placeholder="0.00"
                disabled={isSubmitting}
                className={`w-full px-3 py-2.5 pr-14 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-colors disabled:opacity-50 ${
                  error ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">ETH</span>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Enter the amount of ETH you want to pledge to this campaign.
            </p>
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick amounts</p>
            <div className="flex gap-2">
              {["0.01", "0.05", "0.1", "0.5"].map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setAmount(q); setError(""); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40 ${
                    amount === q
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {q} ETH
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || !amount}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                "Confirm Contribution"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
