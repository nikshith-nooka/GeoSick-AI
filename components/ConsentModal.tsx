import React from 'react';
import { ShieldCheckIcon } from './icons';

interface ConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onConsent,
  onDecline,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 sm:p-8 animate-scaleUp">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
          <ShieldCheckIcon className="w-7 h-7" />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Health & Safety Agreement
        </h2>

        <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-wider">
          Your safety and privacy come first
        </p>

        <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs sm:text-sm text-slate-700 space-y-2 leading-relaxed">
          <p className="font-semibold text-amber-950">
            Before using GeoSick health tools, please keep in mind:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>
              <strong>Helpful Guidance:</strong> GeoSick helps you understand symptoms and health trends, but does <em>not</em> replace care or advice from a doctor.
            </li>
            <li>
              <strong>100% Private:</strong> Your photos and health details stay securely on your device and are never sold or shared.
            </li>
            <li>
              <strong>Age Requirement:</strong> You confirm you are at least 18 years old or using this app with a parent or guardian.
            </li>
            <li>
              <strong>Medical Emergencies:</strong> For acute chest pain, shortness of breath, or trauma, immediately dial <strong>108 (Emergency Ambulance)</strong>.
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDecline}
            className="w-full sm:w-1/2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors order-2 sm:order-1"
          >
            Exit Health Tools
          </button>
          <button
            onClick={onConsent}
            className="w-full sm:w-1/2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] order-1 sm:order-2"
          >
            I Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
