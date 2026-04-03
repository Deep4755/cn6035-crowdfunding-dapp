import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import type { Campaign } from "@/types";

interface AddRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onAddReward: (campaignId: number, title: string, description: string, minContribution: bigint, quantity: bigint) => Promise<void>;
}

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-colors";

const TIER_PRESETS = [
  { label: "Bronze", emoji: "🥉", min: "0.05" },
  { label: "Silver", emoji: "🥈", min: "0.1" },
  { label: "Gold",   emoji: "🥇", min: "0.5" },
];

export default function AddRewardModal({ isOpen, onClose, campaign, onAddReward }: AddRewardModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    minContribution: "",
    quantity: "0",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);

  if (!isOpen || !campaign) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.title.trim()) e.title = "Reward title is required";
    if (!formData.description.trim()) e.description = "Description is required";
    if (!formData.minContribution || parseFloat(formData.minContribution) <= 0)
      e.minContribution = "Minimum contribution must be greater than 0";
    if (parseInt(formData.quantity) < 0) e.quantity = "Quantity cannot be negative";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (campaign && Date.now() / 1000 >= Number(campaign.startAt)) {
      toast.error("Cannot add reward after campaign start");
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const minContribution = ethers.parseEther(formData.minContribution);
      const quantity = BigInt(formData.quantity);
      await onAddReward(campaign.id, formData.title, formData.description, minContribution, quantity);
      setTxSuccess(true);
      setTimeout(() => {
        onClose();
        setFormData({ title: "", description: "", minContribution: "", quantity: "0" });
        setTxSuccess(false);
      }, 1200);
    } catch (error) {
      console.error("Failed to add reward:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (min: string) => {
    setFormData((f) => ({ ...f, minContribution: min }));
    if (errors.minContribution) setErrors((e) => ({ ...e, minContribution: "" }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Add Reward Tier</h2>
              <p className="text-xs text-gray-400">Campaign #{campaign.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success banner */}
        {txSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Reward tier added successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Reward Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); if (errors.title) setErrors({ ...errors, title: "" }); }}
              className={`${inputClass} ${errors.title ? "border-red-300 bg-red-50" : ""}`}
              placeholder="e.g., Early Bird Special"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => { setFormData({ ...formData, description: e.target.value }); if (errors.description) setErrors({ ...errors, description: "" }); }}
              className={`${inputClass} resize-none ${errors.description ? "border-red-300 bg-red-50" : ""}`}
              placeholder="Describe what backers receive for this reward tier"
              rows={3}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Min Contribution */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Minimum Contribution <span className="text-red-400">*</span>
            </label>
            {/* Tier presets */}
            <div className="flex gap-2 mb-2">
              {TIER_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.min)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    formData.minContribution === p.min
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {p.emoji} {p.label} ({p.min} ETH)
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.minContribution}
                onChange={(e) => { setFormData({ ...formData, minContribution: e.target.value }); if (errors.minContribution) setErrors({ ...errors, minContribution: "" }); }}
                className={`${inputClass} pr-14 ${errors.minContribution ? "border-red-300 bg-red-50" : ""}`}
                placeholder="0.1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">ETH</span>
            </div>
            {errors.minContribution
              ? <p className="text-xs text-red-500 mt-1">{errors.minContribution}</p>
              : <p className="text-xs text-gray-400 mt-1">Backers must contribute at least this amount to claim this reward</p>
            }
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Quantity Available
            </label>
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => { setFormData({ ...formData, quantity: e.target.value }); if (errors.quantity) setErrors({ ...errors, quantity: "" }); }}
              className={`${inputClass} ${errors.quantity ? "border-red-300 bg-red-50" : ""}`}
              placeholder="0"
            />
            {errors.quantity
              ? <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>
              : <p className="text-xs text-gray-400 mt-1">Set to 0 for unlimited availability</p>
            }
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || txSuccess}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Transaction in progress...
                </>
              ) : txSuccess ? "Added!" : "Add Reward Tier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
