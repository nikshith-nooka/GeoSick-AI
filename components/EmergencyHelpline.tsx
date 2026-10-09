import React, { useState } from 'react';

export const EmergencyHelpline: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const emergencyContacts = [
    {
      number: '108',
      name: 'National Emergency & Ambulance (Toll-Free)',
      description: 'Pan-India 24/7 medical emergency and rapid ambulance response',
      badge: 'Immediate Life Threat',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    },
    {
      number: '102',
      name: 'Maternal & Child Health Ambulance',
      description: 'Free transport for pregnant mothers and neonates',
      badge: 'Pediatric / Maternal',
      badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    },
    {
      number: '080-46110007',
      name: 'NIMHANS Tele-MANAS Mental Health',
      description: 'Govt. of India 24x7 clinical psychological crisis and suicide prevention',
      badge: 'Mental Crisis 24/7',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    {
      number: '1860-2662-345',
      name: 'Vandrevala Foundation Mental Health',
      description: 'Free confidential counseling in 11+ Indian languages',
      badge: 'Crisis Counseling',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
    {
      number: '1075',
      name: 'National Health Helpline (MoHFW)',
      description: 'Epidemic, dengue, malaria, and communicable outbreak advisory',
      badge: 'Outbreak Guidance',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      number: '1091',
      name: 'Women in Distress Helpline',
      description: 'Safety and medical assistance for women in emergency situations',
      badge: 'Women Helpline',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
  ];

  return (
    <>
      {/* Floating Trigger Pill */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-2xl shadow-red-900/60 hover:shadow-red-600/50 hover:scale-105 active:scale-95 transition-all duration-300 border border-red-400/40 backdrop-blur-md"
          aria-label="Open Emergency Health Services"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Emergency 108</span>
          </span>
        </button>
      </div>

      {/* Emergency Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-2xl border-2 border-red-500/60 bg-gray-900 text-gray-100 p-6 shadow-2xl shadow-red-950/80 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-600/30 text-red-400 border border-red-500/50">
                  <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-red-300">
                    Emergency Medical & Crisis Helplines
                  </h3>
                  <p className="text-xs text-gray-400">
                    Immediate 24/7 public emergency hotlines in India. Tap any number to call.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto py-4 space-y-3 flex-1 pr-1 custom-scrollbar">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.number}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-800/70 hover:bg-gray-800 border border-gray-700/60 transition-all hover:border-red-500/40"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${contact.badgeColor}`}>
                        {contact.badge}
                      </span>
                    </div>
                    <div className="font-semibold text-white text-sm">{contact.name}</div>
                    <p className="text-xs text-gray-400">{contact.description}</p>
                  </div>

                  <a
                    href={`tel:${contact.number.replace(/[^0-9]/g, '')}`}
                    className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-md shadow-red-950/50 hover:scale-105 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Dial {contact.number}</span>
                  </a>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>GeoSick Sovereign Emergency Support</span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyHelpline;
