import React, { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdGateModalProps {
  isOpen: boolean;
  pendingFileName: string;
  onUnlockAfterCountdown: () => void;
  onOpenAuthPass: () => void;
}

const TOTAL_SECONDS = 15;
const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function AdGateModal({
  isOpen,
  pendingFileName,
  onUnlockAfterCountdown,
  onOpenAuthPass,
}: AdGateModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(TOTAL_SECONDS);
      return;
    }
    setSecondsLeft(TOTAL_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  const progressFraction = (TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS;
  const strokeOffset = RING_CIRCUMFERENCE * (1 - progressFraction);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ad-gate-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/55 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="editorial-card w-full max-w-lg rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#92400E]">
                  Daily Guest Allowance Reached · 1 / 1 Used
                </p>
                <h2
                  id="ad-gate-heading"
                  className="font-editorial text-2xl sm:text-3xl text-[#1C1917] mt-1.5"
                >
                  Brief intermission{" "}
                  <span className="italic text-[#3F4E34]">before parsing</span>
                </h2>
              </div>

              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
                  <circle
                    cx="40"
                    cy="40"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="#EAE6DF"
                    strokeWidth="4"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={secondsLeft === 0 ? "#1E3A2B" : "#C2410C"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={strokeOffset}
                    transform="rotate(-90 40 40)"
                    style={{ transition: "stroke-dashoffset 0.85s linear" }}
                  />
                </svg>
                <span className="absolute font-mono-tabular text-base font-semibold text-[#1C1917]">
                  {secondsLeft}s
                </span>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[#57534E]">
              Guest sessions include one zero-backend document analysis per day. Wait{" "}
              <span className="font-mono-tabular font-medium text-[#1C1917]">
                {secondsLeft}s
              </span>{" "}
              to unlock <span className="font-medium text-[#1C1917]">{pendingFileName}</span>, or
              claim a free local Contributor Pass for unlimited analyses.
            </p>

            {/* Simulated Editorial Sponsor Card */}
            <div className="mt-5 rounded-xl bg-[#1C1917] p-5 text-[#F5F5F4]">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono-tabular text-[#A8A29E]">
                <span>PATRON · VERDANT ARCHIVE</span>
                <span>100% LOCAL COMPUTE</span>
              </div>
              <p className="font-editorial text-xl mt-2 text-[#FBF9F5]">
                Precision reading without cloud telemetry.
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#D6D3D1]">
                Verdant Archive sponsors Morphos client-side WebAssembly workers so academic
                manuscripts, 10-K filings, and production runbooks never leave browser memory.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={onOpenAuthPass}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3F4E34] px-4 py-2.5 text-sm font-medium text-[#FBF9F5] transition hover:bg-[#1E3A2B]"
              >
                <Sparkles className="h-4 w-4" />
                Sign In / Contributor Pass
              </button>

              <button
                type="button"
                disabled={secondsLeft > 0}
                onClick={onUnlockAfterCountdown}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  secondsLeft === 0
                    ? "border-[#1E3A2B] bg-[#F5F2EB] text-[#1E3A2B] hover:bg-[#EAE6DF]"
                    : "cursor-not-allowed border-[#EAE6DF] bg-[#FBF9F5] text-[#A8A29E]"
                }`}
              >
                {secondsLeft > 0 ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Continue in {secondsLeft}s
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Continue to Analysis
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
