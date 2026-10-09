
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HomePage } from './components/HomePage';
import { WelcomePage } from './components/WelcomePage';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { ChatBot } from './components/ChatBot';
import { IntroAnimation } from './components/IntroAnimation';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { AlertsPage } from './components/AlertsPage';
import { Bars3Icon, GlobeIcon, HomeIcon, ScanIcon, StethoscopeIcon } from './components/icons';
import { FeedbackModal } from './components/FeedbackModal';
import { I18nProvider } from './components/I18n';
import { hybridDb as localDb } from './services/hybridDb';
import { safeString } from './services/geminiService';
import { EmergencyHelpline } from './components/EmergencyHelpline';
import { OnboardingFlow } from './components/OnboardingFlow';
import { LoadingSpinner } from './components/LoadingSpinner';
import type { User, ActivityLogItem, Page } from './types';

// Dynamic Code Splitting for heavy modules (Globe 3D, Computer Vision, Diagnostics)
const GlobePage = lazy(() => import('./components/GlobePage').then(m => ({ default: m.GlobePage })));
const ImageAnalysisPage = lazy(() => import('./components/ImageAnalysisPage').then(m => ({ default: m.ImageAnalysisPage })));
const PrescriptionAnalysisPage = lazy(() => import('./components/PrescriptionAnalysisPage').then(m => ({ default: m.PrescriptionAnalysisPage })));
const CheckupPage = lazy(() => import('./components/CheckupPage').then(m => ({ default: m.CheckupPage })));
const MentalHealthPage = lazy(() => import('./components/MentalHealthPage').then(m => ({ default: m.MentalHealthPage })));
const SymptomCheckerPage = lazy(() => import('./components/SymptomCheckerPage').then(m => ({ default: m.SymptomCheckerPage })));
const HealthForecast = lazy(() => import('./components/HealthForecast').then(m => ({ default: m.HealthForecast })));
const AdminDashboardPage = lazy(() => import('./components/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const WaterLogPage = lazy(() => import('./components/WaterLogPage').then(m => ({ default: m.WaterLogPage })));
const AiFlywheelDashboard = lazy(() => import('./components/AiFlywheelDashboard').then(m => ({ default: m.AiFlywheelDashboard })));
const MunicipalTicketsPage = lazy(() => import('./components/MunicipalTicketsPage').then(m => ({ default: m.MunicipalTicketsPage })));
const ActivityHistoryPage = lazy(() => import('./components/ActivityHistoryPage').then(m => ({ default: m.ActivityHistoryPage })));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));

const ACTIVITY_HISTORY_KEY = 'geosick_activity_history';
const GLOBAL_ACTIVITY_HISTORY_KEY = 'geosick_global_activity_history';
const NAV_STATE_KEY = 'geosick_current_page';
const INTRO_SHOWN_KEY = 'geosick_intro_shown';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = sessionStorage.getItem(NAV_STATE_KEY);
    return (saved as Page) || 'home';
  });
  
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem(INTRO_SHOWN_KEY);
  });

  const [user, setUser] = useState<User | null>(() => {
    return localDb.getSession();
  });
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('geosick_onboarding_completed');
  });
  const [activityHistory, setActivityHistory] = useState<ActivityLogItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const navigateTo = useCallback((page: Page) => {
    setCurrentPage(page);
    sessionStorage.setItem(NAV_STATE_KEY, page);
  }, []);

  useEffect(() => {
    const activeSession = localDb.getSession();
    if (activeSession) {
      setUser(activeSession);
    }

    try {
      const storedHistory = localStorage.getItem(ACTIVITY_HISTORY_KEY);
      if (storedHistory) {
          setActivityHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
        console.error("Could not load activity history:", error);
    }
  }, [navigateTo]);

  const addGlobalActivityToHistory = (item: ActivityLogItem) => {
      try {
          const globalHistory: ActivityLogItem[] = JSON.parse(localStorage.getItem(GLOBAL_ACTIVITY_HISTORY_KEY) || '[]');
          const newGlobalHistory = [item, ...globalHistory];
          localStorage.setItem(GLOBAL_ACTIVITY_HISTORY_KEY, JSON.stringify(newGlobalHistory));
      } catch (error) {
           console.error("Could not save global activity:", error);
      }
  };

  const addActivityToHistory = (item: Omit<ActivityLogItem, 'id' | 'timestamp' | 'userPhone'>) => {
      if (!user) return;
      const newActivity: ActivityLogItem = {
          ...item,
          id: new Date().toISOString() + Math.random(),
          timestamp: Date.now(),
          userPhone: user.phone || '',
      };

      setActivityHistory(prevHistory => {
          const newHistory = [newActivity, ...prevHistory];
          try {
            localStorage.setItem(ACTIVITY_HISTORY_KEY, JSON.stringify(newHistory));
          } catch (error) {
              console.error("Could not save activity history:", error);
          }
          return newHistory;
      });

      addGlobalActivityToHistory(newActivity);
  };
  
  const handleUpdateUser = async (updatedDetails: Partial<User>) => {
    if (!user?.id) return false;
    
    try {
        const success = localDb.updateProfile(user.id, updatedDetails);
        if (success) {
            const freshUser = localDb.getUserById(user.id);
            if (freshUser) setUser(freshUser);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Failed to update user:", error);
        return false;
    }
  };

  const handleAuthSuccess = (authedUser: User) => {
    setUser(authedUser);
    setShowAuth(false);
    navigateTo('welcome');
  };
  
  const handleLogout = async () => {
      localDb.signOut();
      setUser(null);
      navigateTo('home');
      setIsFeedbackModalOpen(false);
  };

  const handleFinishIntro = () => {
    setShowIntro(false);
    sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
  };

  const renderPublicPages = () => {
    switch (currentPage) {
        case 'about':
            return <AboutPage onBack={() => navigateTo('home')} />;
        case 'contact':
            return <ContactPage onBack={() => navigateTo('home')} />;
        case 'privacy-policy':
            return <PrivacyPolicyPage onBack={() => navigateTo('home')} />;
        case 'explore':
             return (
                 <div className="w-screen h-screen overflow-hidden bg-slate-950 fixed inset-0 z-50">
                     <Suspense fallback={<div className="flex items-center justify-center h-full text-white"><LoadingSpinner /></div>}>
                         <GlobePage onBack={() => navigateTo('home')} />
                     </Suspense>
                 </div>
             );
        case 'home':
        default:
            return <HomePage
                onLoginClick={() => setShowAuth(true)}
                onAboutClick={() => navigateTo('about')}
                onContactClick={() => navigateTo('contact')}
                onExploreClick={() => navigateTo('explore')}
            />;
    }
  }

  const renderAuthenticatedApp = () => {
    if (!user) return null;

    const renderPage = () => {
        const isAdmin = !!user.isAdmin;
        switch (currentPage) {
            case 'welcome':
            case 'home':
                return <WelcomePage
                    user={user}
                    onAnalyze={() => navigateTo('image-analysis')}
                    onAnalyzePrescription={() => navigateTo('prescription-analysis')}
                    onAnalyzeMentalHealth={() => navigateTo('mental-health')}
                    onCheckSymptoms={() => navigateTo('symptom-checker')}
                    onWaterLog={() => navigateTo('water-log')}
                    onOpenAiFlywheel={() => navigateTo('ai-flywheel')}
                />;
            case 'live-alerts':
                return <AlertsPage />;
            case 'image-analysis':
                return <ImageAnalysisPage
                    onBack={() => navigateTo('welcome')}
                    onScheduleCheckup={() => navigateTo('checkup')}
                    onAnalysisComplete={addActivityToHistory}
                    onNavigate={navigateTo}
                />;
            case 'prescription-analysis':
                return <PrescriptionAnalysisPage onBack={() => navigateTo('welcome')} onAnalysisComplete={addActivityToHistory} />;
            case 'checkup':
                return <CheckupPage onBack={() => navigateTo('image-analysis')} />;
            case 'mental-health':
                return <MentalHealthPage onBack={() => navigateTo('welcome')} onAnalysisComplete={addActivityToHistory} />;
            case 'symptom-checker':
                return <SymptomCheckerPage onBack={() => navigateTo('welcome')} onAnalysisComplete={addActivityToHistory} />;
            case 'health-briefing': 
                 return <HealthForecast onBack={() => navigateTo('welcome')} />;
            case 'activity-history':
                 return <ActivityHistoryPage history={activityHistory} onBack={() => navigateTo('welcome')} />;
            case 'profile':
                return <ProfilePage 
                    user={user} 
                    onBack={() => navigateTo('welcome')} 
                    onUpdateUser={handleUpdateUser}
                    onNavigate={navigateTo}
                    onLogout={handleLogout}
                />;
            case 'privacy-policy':
                return <PrivacyPolicyPage onBack={() => navigateTo('welcome')} />;
            case 'water-log':
                return <WaterLogPage onBack={() => navigateTo('welcome')} />;
            case 'admin-dashboard':
                return isAdmin ? <AdminDashboardPage onBack={() => navigateTo('welcome')} /> : <p>Access Denied.</p>;
            case 'ai-flywheel':
                return <AiFlywheelDashboard onBack={() => navigateTo('welcome')} />;
            case 'municipal-tickets':
                return <MunicipalTicketsPage onBack={() => navigateTo('welcome')} onNavigate={navigateTo} />;
            case 'about':
                 return <AboutPage onBack={() => navigateTo('welcome')} />;
            case 'contact':
                return <ContactPage onBack={() => navigateTo('welcome')} />;
            case 'explore':
                return <GlobePage onBack={() => navigateTo('welcome')} />;
            default:
                return <WelcomePage
                    user={user}
                    onAnalyze={() => navigateTo('image-analysis')}
                    onAnalyzePrescription={() => navigateTo('prescription-analysis')}
                    onAnalyzeMentalHealth={() => navigateTo('mental-health')}
                    onCheckSymptoms={() => navigateTo('symptom-checker')}
                    onWaterLog={() => navigateTo('water-log')}
                    onOpenAiFlywheel={() => navigateTo('ai-flywheel')}
                />;
        }
    };
    
    return (
        <div className="flex h-screen bg-slate-100">
            <Sidebar 
                user={user} 
                currentPage={currentPage} 
                onNavigate={(page: Page) => {
                    navigateTo(page);
                    setIsSidebarOpen(false);
                }} 
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
            />
             <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm relative z-20">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-1" aria-label="Open menu">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <GlobeIcon className="w-7 h-7 text-blue-500" />
                        <h1 className="text-lg font-bold tracking-tight text-slate-800">GeoSick</h1>
                    </div>
                    <div className="w-7"></div>
                </header>
                <main className={`flex-1 ${currentPage === 'explore' ? 'overflow-hidden h-full relative' : 'overflow-y-auto'}`}>
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-8 text-center">
                            <LoadingSpinner />
                            <p className="mt-3 text-xs text-slate-500 font-medium tracking-wide">Loading module...</p>
                        </div>
                    }>
                        {renderPage()}
                    </Suspense>
                </main>
                {/* Mobile Bottom Navigation Bar */}
                {currentPage !== 'explore' && (
                  <nav className="md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around z-20 shadow-lg flex-shrink-0">
                    <button
                      onClick={() => navigateTo('welcome')}
                      className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-lg transition-colors ${
                        currentPage === 'welcome' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      aria-label="Navigate to Home Dashboard"
                    >
                      <HomeIcon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5">Home</span>
                    </button>
                    <button
                      onClick={() => navigateTo('image-analysis')}
                      className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-lg transition-colors ${
                        currentPage === 'image-analysis' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      aria-label="Navigate to Image Analysis"
                    >
                      <ScanIcon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5">Scan</span>
                    </button>
                    <button
                      onClick={() => navigateTo('symptom-checker')}
                      className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-lg transition-colors ${
                        currentPage === 'symptom-checker' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      aria-label="Navigate to Symptom Checker"
                    >
                      <StethoscopeIcon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5">Symptom</span>
                    </button>
                    <button
                      onClick={() => navigateTo('explore')}
                      className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-lg transition-colors ${
                        currentPage === 'explore' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      aria-label="Navigate to 3D Globe"
                    >
                      <GlobeIcon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5">Globe</span>
                    </button>
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                      aria-label="Open navigation drawer"
                    >
                      <Bars3Icon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5">More</span>
                    </button>
                  </nav>
                )}
            </div>
        </div>
    );
  };

  if (showIntro) {
    return <IntroAnimation onComplete={handleFinishIntro} />;
  }

  return (
    <>
      {user ? renderAuthenticatedApp() : renderPublicPages()}
      {user && <ChatBot onNavigate={navigateTo} />}
      {user && isFeedbackModalOpen && (
        <FeedbackModal 
            user={user}
            onClose={() => setIsFeedbackModalOpen(false)} 
        />
      )}
      {user && showOnboarding && (
        <OnboardingFlow 
          userName={user.name || user.email?.split('@')[0] || 'Community Member'}
          onComplete={() => setShowOnboarding(false)} 
        />
      )}
      {showAuth && (
        <AuthPage
          onClose={() => setShowAuth(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
      <EmergencyHelpline />
    </>
  );
}

export default function App() {
    return (
        <I18nProvider>
            <AppContent />
        </I18nProvider>
    );
}
