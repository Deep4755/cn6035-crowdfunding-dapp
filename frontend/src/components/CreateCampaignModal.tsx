import { useState } from "react";
import { ethers } from "ethers";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (goal: bigint, startAt: number, endAt: number, metadataURI: string) => Promise<void>;
}

const CAMPAIGN_TYPES = [
  { value: "funding", label: "Funding", desc: "Raise ETH for a project or cause" },
  { value: "idea", label: "Idea", desc: "Validate and fund a new idea" },
  { value: "reward-based", label: "Reward-based", desc: "Backers receive rewards for contributing" },
];

const inputClass =
  "w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-colors";
const errorInputClass = "border-red-300 bg-red-50";
const normalInputClass = "border-gray-200";

export default function CreateCampaignModal({ isOpen, onClose, onCreate }: CreateCampaignModalProps) {
  const [formData, setFormData] = useState({
    campaignType: "funding",
    goal: "",
    startDelayMinutes: "1",
    duration: "9",
    metadataURI: "https://docs.google.com/document/d/1jdY7RMJFsRBis3XAMLv10tXP5u_51HFHJv0fH9_vIis/edit?usp=sharing",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.goal || parseFloat(formData.goal) <= 0)
      e.goal = "Goal must be greater than 0 ETH";
    if (!formData.duration || parseInt(formData.duration) < 1)
      e.duration = "Duration must be at least 1 minute";
    if (!formData.metadataURI.trim())
      e.metadataURI = "Project description URL is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTxSuccess(false);

    try {
      const now = Math.floor(Date.now() / 1000);
      const userDelaySec = Math.max(0, (parseInt(formData.startDelayMinutes) || 0) * 60);
      const startAt = now + Math.max(15, userDelaySec);
      const endAt = startAt + parseInt(formData.duration) * 60;
      const goal = ethers.parseEther(formData.goal);

      await onCreate(goal, startAt, endAt, formData.metadataURI);

      setTxSuccess(true);
      setTimeout(() => {
        onClose();
        setFormData({
          campaignType: "funding",
          goal: "",
          startDelayMinutes: "1",
          duration: "9",
          metadataURI: "https://docs.google.com/document/d/1jdY7RMJFsRBis3XAMLv10tXP5u_51HFHJv0fH9_vIis/edit?usp=sharing",
        });
        setTxSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60 > 0 ? `${seconds % 60}s` : ""}`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m > 0 ? `${m}m` : ""}`;
  };

  const startDelaySec = Math.max(15, (parseInt(formData.startDelayMinutes) || 0) * 60);
  const durationSec = (parseInt(formData.duration) || 0) * 60;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.82m2.56-5.84a14.98 14.98 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">Create Campaign</h2>
              <p className="text-xs text-gray-400 hidden sm:block">Fill in the details to launch your campaign</p>
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
          <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-700 font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Campaign created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">

          {/* Campaign Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Campaign Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CAMPAIGN_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, campaignType: t.value })}
                  className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl border text-left transition-all ${
                    formData.campaignType === t.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight hidden sm:block">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Funding Goal <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.goal}
                onChange={(e) => {
                  setFormData({ ...formData, goal: e.target.value });
                  if (errors.goal) setErrors({ ...errors, goal: "" });
                }}
                className={`${inputClass} ${errors.goal ? errorInputClass : normalInputClass} pr-14`}
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">ETH</span>
            </div>
            {errors.goal
              ? <p className="text-xs text-red-500 mt-1">{errors.goal}</p>
              : <p className="text-xs text-gray-400 mt-1">Minimum amount you need to raise for the campaign to succeed</p>
            }
          </div>

          {/* Start Delay + Duration side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Start Delay
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.startDelayMinutes}
                  onChange={(e) => setFormData({ ...formData, startDelayMinutes: e.target.value })}
                  className={`${inputClass} ${normalInputClass} pr-10`}
                  placeholder="1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Starts in {formatTime(startDelaySec)}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Duration <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => {
                    setFormData({ ...formData, duration: e.target.value });
                    if (errors.duration) setErrors({ ...errors, duration: "" });
                  }}
                  className={`${inputClass} ${errors.duration ? errorInputClass : normalInputClass} pr-10`}
                  placeholder="60"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
              </div>
              {errors.duration
                ? <p className="text-xs text-red-500 mt-1">{errors.duration}</p>
                : <p className="text-xs text-gray-400 mt-1">Runs for {formatTime(durationSec)}</p>
              }
            </div>
          </div>

          {/* Metadata URI */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Project Description URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.metadataURI}
              onChange={(e) => {
                setFormData({ ...formData, metadataURI: e.target.value });
                if (errors.metadataURI) setErrors({ ...errors, metadataURI: "" });
              }}
              className={`${inputClass} ${errors.metadataURI ? errorInputClass : normalInputClass}`}
              placeholder="https://docs.google.com/..."
            />
            {errors.metadataURI
              ? <p className="text-xs text-red-500 mt-1">{errors.metadataURI}</p>
              : <p className="text-xs text-gray-400 mt-1">Link to a Google Doc, Notion page, or any URL describing your project</p>
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
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Transaction in progress...
                </>
              ) : txSuccess ? (
                "Created!"
              ) : (
                "Create Campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
