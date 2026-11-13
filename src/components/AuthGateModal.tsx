import React, { useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ContributorProfile, DisciplineDomain } from "../types/platform";

interface AuthGateModalProps {
  isOpen: boolean;
  defaultDomain?: DisciplineDomain;
  onClose: () => void;
  onAuthenticate: (profile: ContributorProfile) => void;
}

const CLEARANCE_BY_DOMAIN: Record<DisciplineDomain, string[]> = {
  EDUCATION: ["Graduate Fellow", "Principal Investigator", "Curriculum Reviewer"],
  FINANCE: ["Portfolio Analyst", "Managing Director", "Risk Committee Member"],
  ENTERPRISE: ["Staff SRE Operator", "Policy Architect", "VP Operations"],
};

export function AuthGateModal({
  isOpen,
  defaultDomain = "EDUCATION",
  onClose,
  onAuthenticate,
}: AuthGateModalProps) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState<DisciplineDomain>(defaultDomain);
  const [organization, setOrganization] = useState("");
  const [focusOrMandate, setFocusOrMandate] = useState("");
  const [clearanceLevel, setClearanceLevel] = useState(
    CLEARANCE_BY_DOMAIN[defaultDomain][0]
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDomain(defaultDomain);
      setClearanceLevel(CLEARANCE_BY_DOMAIN[defaultDomain][0]);
      setError("");
    }
  }, [isOpen, defaultDomain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !handle.trim() || !email.trim() || !organization.trim()) {
      setError("Please complete Name, Handle, Email, and Organization.");
      return;
    }
    const formattedHandle = handle.trim().startsWith("@")
      ? handle.trim()
      : `@${handle.trim().replace(/\s+/g, "_").toLowerCase()}`;

    onAuthenticate({
      name: name.trim(),
      handle: formattedHandle,
      email: email.trim(),
      domain,
      organization: organization.trim(),
      focusOrMandate:
        focusOrMandate.trim() ||
        (domain === "EDUCATION"
          ? "Sparse ML & Theoretical Proofs"
          : domain === "FINANCE"
          ? "Semiconductor Capex & Sensitivity"
          : "Deterministic Edge Policy Governance"),
      clearanceLevel,
      signedInAt: new Date().toISOString(),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/50 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="editorial-card w-full max-w-lg rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#3F4E34]">
                  Local Contributor Pass · Zero Backend
                </p>
                <h2
                  id="auth-modal-heading"
                  className="font-editorial text-2xl sm:text-3xl text-[#1C1917] mt-1"
                >
                  Verify your{" "}
                  <span className="italic text-[#1E3A2B]">workspace identity</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sign in dialog"
                className="rounded-lg border border-[#EAE6DF] p-2 text-[#78716C] transition hover:bg-[#F5F2EB] hover:text-[#1C1917]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#78716C]">
              Stored strictly in your browser&apos;s localStorage. Lifts the daily document cap
              and unlocks Peer Flashcard, Alpha Scenario, and Policy PR publishing.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-medium text-[#292524] mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Ada Lovelace"
                    className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#3F4E34]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-handle"
                    className="block text-xs font-medium text-[#292524] mb-1"
                  >
                    Contributor Handle
                  </label>
                  <input
                    id="auth-handle"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@ada_quant"
                    className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#3F4E34]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-[#292524] mb-1"
                  >
                    Work or Academic Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ada@archive.edu"
                    className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#3F4E34]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-org"
                    className="block text-xs font-medium text-[#292524] mb-1"
                  >
                    Institution / Fund / Team
                  </label>
                  <input
                    id="auth-org"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Babbage Research Group"
                    className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#3F4E34]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="auth-domain"
                    className="block text-xs font-medium text-[#292524] mb-1"
                  >
                    Primary Discipline
                  </label>
                  <select
                    id="auth-domain"
                    value={domain}
                    onChange={(e) => {
                      const nextDomain = e.target.value as DisciplineDomain;
                      setDomain(nextDomain);
                      setClearanceLevel(CLEARANCE_BY_DOMAIN[nextDomain][0]);
                    }}
                    className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#3F4E34]"
                  >
                    <option value="EDUCATION">Education & Research</option>
                    <option value="FINANCE">Finance & Quant</option>
                    <option value="ENTERPRISE">Enterprise & Workflow</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="auth-clearance"
                    className="block text-xs font-medium text-[#292524] mb-1"
                  >
                    Role / Clearance
                  </label>
                  <select
                    id="auth-clearance"
                    value={clearanceLevel}
                    onChange={(e) => setClearanceLevel(e.target.value)}
                    className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#3F4E34]"
                  >
                    {CLEARANCE_BY_DOMAIN[domain].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-focus"
                  className="block text-xs font-medium text-[#292524] mb-1"
                >
                  Research Focus / Mandate / SLA Scope
                </label>
                <input
                  id="auth-focus"
                  type="text"
                  value={focusOrMandate}
                  onChange={(e) => setFocusOrMandate(e.target.value)}
                  placeholder="e.g. Sparse Transformers, HBM4 Capex Sensitivity, or Edge SLA Policy"
                  className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#3F4E34]"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-medium text-[#C2410C]">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#EAE6DF] px-4 py-2 text-sm font-medium text-[#57534E] hover:bg-[#F5F2EB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3F4E34] px-5 py-2 text-sm font-medium text-[#FBF9F5] transition hover:bg-[#1E3A2B]"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Activate Contributor Pass
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
