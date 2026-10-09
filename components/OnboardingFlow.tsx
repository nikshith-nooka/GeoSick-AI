import React, { useState } from 'react';
import { ShieldCheckIcon, GlobeIcon, StethoscopeIcon, ScanIcon, CheckCircleIcon } from './icons';

interface OnboardingFlowProps {
  userName?: string;
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userName = 'Friend',
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [hasConsented, setHasConsented] = useState(false);

  const handleFinish = () => {
    if (!hasConsented) return;
    localStorage.setItem('geosick_onboarding_completed', 'true');
    localStorage.setItem('geosick_informed_consent_timestamp', new Date().toISOString());
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/80 bg-slate-900 text-white shadow-2xl shadow-blue-950/80 p-6 sm:p-8 flex flex-col overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Progress Tracker */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-blue-500'
                    : s < step
                    ? 'w-4 bg-emerald-500'
                    : 'w-4 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Step {step} of 4
          </span>
        </div>

        {/* Step 1: Welcome & Warm Introduction */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-3xl">
              👋
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to GeoSick, {userName}!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              GeoSick is your friendly health assistant. We help you check everyday symptoms, scan skin concerns, and keep your neighborhood clean and healthy.
            </p>
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <span>🔒 Works Offline Anywhere:</span>
              </div>
              <p className="leading-relaxed">
                You can check symptoms and scan photos anytime on your device, even when you have no internet connection.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: What You Can Do (Simple & Plain) */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Everything Made Simple
            </h2>
            <p className="text-xs text-slate-300">
              Four easy tools to help you and your family stay safe:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700">
                <span className="text-xl mb-1 block">📸</span>
                <span className="text-xs font-bold text-white block">Photo Checker</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Take a picture of a rash, skin spot, or medicine to get instant guidance.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700">
                <span className="text-xl mb-1 block">💬</span>
                <span className="text-xs font-bold text-white block">Symptom Checker</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Answer a few simple questions about how you feel to see what might help.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700">
                <span className="text-xl mb-1 block">🌍</span>
                <span className="text-xs font-bold text-white block">Local Health Map</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  See dengue alerts, air cleanliness, and safe water areas near your home.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700">
                <span className="text-xl mb-1 block">🚰</span>
                <span className="text-xs font-bold text-white block">Fix Neighborhood Issues</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Report dirty water or garbage in your area so city teams can clean it up.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Privacy (Plain Human Language) */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-3xl">
              🛡️
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Your Privacy Comes First
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We treat your personal health with complete respect:
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 mt-0.5 font-bold">✓</span>
                <span>
                  <strong>Stays on Your Device:</strong> Your photos and private symptom checks are processed safely on your phone or computer.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 mt-0.5 font-bold">✓</span>
                <span>
                  <strong>Never Sold:</strong> We never sell, rent, or share your medical details with advertisers or data brokers.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 mt-0.5 font-bold">✓</span>
                <span>
                  <strong>You Are in Total Control:</strong> You can download your records or delete your account anytime with a single click.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Step 4: Friendly Health Agreement */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl">
              🩺
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Important Health Notice
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Please take a quick second to review how to use GeoSick safely:
            </p>

            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 leading-relaxed space-y-2">
              <p className="font-semibold">
                Please remember:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-amber-200/90 text-[11px]">
                <li>GeoSick provides helpful health tips, but it does not replace a licensed medical doctor.</li>
                <li>Never stop taking your prescribed medications without talking to your physician first.</li>
                <li>If you have severe chest pain, trouble breathing, or an emergency, call <strong>108 (Ambulance)</strong> immediately.</li>
              </ul>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={hasConsented}
                  onChange={(e) => setHasConsented(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-500 rounded border-slate-600 focus:ring-blue-400 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  I understand that GeoSick provides helpful guidance, and I will consult a doctor for serious health problems.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!hasConsented}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 flex items-center gap-1.5"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Get Started</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
