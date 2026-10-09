import React from 'react';

interface LowConfidenceAlertProps {
  confidenceScore?: number;
  reason?: string;
  onRetake?: () => void;
  onFindClinic?: () => void;
}

export const LowConfidenceAlert: React.FC<LowConfidenceAlertProps> = ({
  confidenceScore = 0.58,
  reason = 'Sub-optimal lighting, artifact interference, or atypical multi-system presentation detected.',
  onRetake,
  onFindClinic,
}) => {
  const percentage = Math.round(confidenceScore * 100);

  return (
    <div className="w-full my-4 rounded-xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/40 to-black/60 p-4 sm:p-5 backdrop-blur-md text-gray-200 shadow-xl">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex-shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <span>⚠️ Low Clinical Confidence ({percentage}%)</span>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Secondary Verification Required
              </span>
            </h4>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed mb-3">
            The neural inference engine returned a confidence rating below the clinical safety threshold (70%). {reason}
          </p>

          <div className="w-full bg-gray-800 rounded-full h-2.5 mb-4 overflow-hidden border border-gray-700">
            <div
              className={`h-full transition-all duration-700 rounded-full ${
                percentage < 50 ? 'bg-red-500' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.max(percentage, 8)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {onRetake && (
              <button
                onClick={onRetake}
                className="px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xs font-semibold text-gray-200 transition-all hover:scale-105 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Re-scan with Better Lighting</span>
              </button>
            )}

            {onFindClinic && (
              <button
                onClick={onFindClinic}
                className="px-3.5 py-1.5 rounded-lg bg-teal-600/80 hover:bg-teal-500 text-white text-xs font-semibold transition-all hover:scale-105 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Locate Verified Clinics</span>
              </button>
            )}

            <a
              href="https://www.google.com/maps/search/hospitals+and+clinics+near+me"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <span>Find Doctors on Google Maps &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LowConfidenceAlert;
