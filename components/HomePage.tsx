import React from 'react';
import { GlobeIcon, LockClosedIcon, CameraIcon, StethoscopeIcon, BuildingOfficeIcon } from './icons';
import { WaveBackground } from './WaveBackground';
import { LanguageSelector } from './LanguageSelector';
import { useI18n } from './I18n';
import { LiveHealthAlerts } from './LiveHealthAlerts';

interface HomePageProps {
  onLoginClick: () => void;
  onAboutClick: () => void;
  onContactClick: () => void;
  onExploreClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onLoginClick, onAboutClick, onContactClick, onExploreClick }) => {
  const { t } = useI18n();
  return (
    <div className="relative w-full min-h-screen flex flex-col items-center p-4 animate-fade-in overflow-hidden">
      <WaveBackground />

      <div className="relative z-10 w-full flex flex-col items-center flex-grow">
          {/* Header */}
          <header className="w-full max-w-7xl mx-auto py-4 px-0 sm:px-6 lg:px-8 flex justify-end items-center space-x-2 sm:space-x-4">
              <div className="w-36">
                <LanguageSelector />
              </div>
              <button onClick={onAboutClick} className="text-sm sm:text-base text-slate-600 font-medium hover:text-blue-500 transition-colors">{t('about')}</button>
              <button onClick={onContactClick} className="text-sm sm:text-base text-slate-600 font-medium hover:text-blue-500 transition-colors">{t('contact')}</button>
              <button onClick={onLoginClick} className="bg-white hover:bg-slate-100 text-blue-500 font-semibold py-2 px-3 sm:px-4 rounded-md transition-all duration-300 text-sm sm:text-base border border-blue-200 shadow-sm hover:shadow-md">{t('login')}</button>
          </header>

          {/* Main Content */}
          <main className="w-full flex-grow flex flex-col items-center text-center">
            {/* Hero Section */}
            <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col justify-center py-10 sm:py-16 animate-fade-in-up">
                  <div className="flex items-center justify-center gap-3 sm:gap-4">
                      <GlobeIcon className="w-10 h-10 sm:w-16 sm:h-16 text-blue-500" />
                      <h1 className="text-4xl sm:text-6xl font-bold text-slate-800 tracking-tight">
                          GeoSick
                      </h1>
                  </div>
                  <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-slate-600">
                      {t('homepage_subtitle')}
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xs sm:max-w-none sm:w-auto mx-auto">
                      <button
                          onClick={onExploreClick}
                          className="w-full sm:w-auto bg-slate-700 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-slate-300"
                          aria-label="Start exploring the globe"
                      >
                          <GlobeIcon className="w-5 h-5 mr-3" />
                          {t('explore_globe')}
                      </button>
                      <button
                          onClick={onLoginClick}
                          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
                          aria-label="Log in to use the app"
                      >
                         <LockClosedIcon className="w-5 h-5 mr-3" />
                          {t('get_started')}
                      </button>
                  </div>
            </div>

            {/* 4 Simple Health & Safety Cards */}
            <div className="w-full max-w-6xl mx-auto px-4 mb-12 animate-fade-in-up">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  Easy & Reliable Health Tools
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2">
                  Everything You Need to Stay Healthy & Safe
                </h2>
                <p className="text-slate-600 text-sm max-w-xl mx-auto mt-1">
                  Check symptoms, scan health concerns, track local air and water quality, and get help fast.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
                {/* Card 1: Photo & Skin Check */}
                <div 
                  onClick={onLoginClick}
                  className="group relative bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CameraIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Quick & Private</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Scan Skin & Photos
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Take a photo of a rash, skin spot, or medicine label to get instant, private guidance.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                    <span>Scan Photo</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Card 2: Symptom Checker */}
                <div 
                  onClick={onLoginClick}
                  className="group relative bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <StethoscopeIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Helpful Guide</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Check Your Symptoms
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Answer a few simple questions about fever, cough, or pain to see what might help you feel better.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                    <span>Check Symptoms</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Card 3: 3D Health Globe */}
                <div 
                  onClick={onExploreClick}
                  className="group relative bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <GlobeIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Live 3D Map</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      Local Health Map
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Explore an interactive globe to see local illnesses, air quality, and water safety near your area.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-600">
                    <span>Open 3D Globe</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Card 4: Community Help */}
                <div 
                  onClick={onLoginClick}
                  className="group relative bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:border-teal-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BuildingOfficeIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Take Action</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                      Fix Neighborhood Issues
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Report dirty tap water, open garbage, or stagnant water to get municipal workers to clean it up.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
                    <span>Report an Issue</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Alerts Section */}
            <LiveHealthAlerts />

          </main>
      </div>
    </div>
  );
};