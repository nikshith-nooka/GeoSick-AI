import React from 'react';
import { BackButton } from './BackButton';
import { ShieldCheckIcon, LockClosedIcon, DocumentChartBarIcon, HeartPulseIcon } from './icons';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 flex flex-col items-center animate-fade-in">
      <main className="w-full max-w-4xl mx-auto z-10">
        <header className="mb-8">
          <div className="mb-4">
            <BackButton onClick={onBack} />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShieldCheckIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Privacy Policy & Health Guidelines
              </h1>
              <p className="text-sm text-slate-600">
                How we protect your health data and keep your information 100% private
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          {/* Health Notice Alert */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h2 className="font-bold text-base text-amber-950">Important Health Notice</h2>
              <p className="mt-1 text-xs sm:text-sm text-amber-800">
                GeoSick is designed for educational guidance, early awareness, and community safety. It does <strong>not</strong> provide official medical diagnoses, replace care from licensed doctors, or prescribe medicines. In case of severe chest pain, trouble breathing, or urgent medical emergencies, immediately call <strong>108 (Ambulance)</strong> or visit the nearest hospital.
              </p>
            </div>
          </div>

          {/* Section 1: Edge AI & Local Processing */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-base">
              <LockClosedIcon className="w-5 h-5 text-blue-500" />
              <h2>1. On-Device Privacy & Processing</h2>
            </div>
            <p>
              GeoSick prioritizes your privacy by processing your photos and scans directly on your device whenever possible:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-600">
              <li>Images and audio are checked privately in your browser without permanent cloud storage unless you choose to report an issue to your city council.</li>
              <li>No personal photos, biometric data, or private device details are ever sold or shared with advertisers.</li>
              <li>Your health checks, water logs, and symptom notes stay safely stored on your device.</li>
            </ul>
          </section>

          {/* Section 2: Data Rights */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-base">
              <DocumentChartBarIcon className="w-5 h-5 text-emerald-500" />
              <h2>2. Your Rights & Total Data Control</h2>
            </div>
            <p>
              You are always in full control of your personal information:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Download Your Records</h3>
                <p className="text-xs text-slate-600 mt-1">
                  You can export and save your health history, checks, and logs anytime directly from your Profile page.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Delete Your Account & History</h3>
                <p className="text-xs text-slate-600 mt-1">
                  You have the right to permanently delete your account, saved checks, and history at any time with one click.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Anonymous Community Health Alerts */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-base">
              <HeartPulseIcon className="w-5 h-5 text-rose-500" />
              <h2>3. Anonymous Community Health Alerts</h2>
            </div>
            <p>
              To help protect neighborhoods against health risks (like dengue outbreaks or dirty water pools), GeoSick shares general community alert summaries.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-600">
              <li>All reports are 100% anonymous: your name, phone number, and personal home address are never shared.</li>
              <li>General area trends help notify city cleanup teams to clear standing water or unmanaged waste.</li>
            </ul>
          </section>

          {/* Section 4: Contact Us */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-900 text-base mb-2">4. Questions & Support</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Have questions about your privacy or data? Contact our team at <span className="font-mono text-blue-600">privacy@geosick.ai</span> or call the National Health Helpline at <span className="font-mono text-blue-600">14416</span>.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>GeoSick Health & Privacy Policy</span>
              <span>Updated: September 2026</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
