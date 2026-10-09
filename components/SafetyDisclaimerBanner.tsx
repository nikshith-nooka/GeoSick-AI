import React from 'react';

interface SafetyDisclaimerBannerProps {
  featureName?: string;
  onEmergencyClick?: () => void;
  compact?: boolean;
}

export const SafetyDisclaimerBanner: React.FC<SafetyDisclaimerBannerProps> = ({
  featureName = 'Health AI Tool',
  onEmergencyClick,
  compact = false,
}) => {
  return (
    <div
      role="alert"
      className={`w-full rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-red-500/10 backdrop-blur-md text-amber-200 shadow-lg ${
        compact ? 'p-2.5 text-xs' : 'p-3.5 sm:p-4 text-xs sm:text-sm'
      } mb-4 transition-all duration-300`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex-shrink-0 mt-0.5 p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </span>
          <div className="leading-relaxed">
            <span className="font-bold tracking-wide text-amber-300 mr-1.5 uppercase text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30">
              Important Health Notice
            </span>
            <span className="text-gray-300">
              {featureName} is for informational guidance only. It does{' '}
              <strong className="text-amber-200 font-semibold">not</strong> replace evaluation or advice from a licensed doctor or healthcare professional.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <a
            href="tel:108"
            onClick={(e) => {
              if (onEmergencyClick) {
                e.preventDefault();
                onEmergencyClick();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-md shadow-red-950/40 hover:scale-105"
            title="Immediate emergency ambulance dispatch"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Call 108 Emergency</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default SafetyDisclaimerBanner;
