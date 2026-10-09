import React, { useState } from 'react';
import type { User, Page } from '../types';
import { GlobeIcon, HomeIcon, HistoryIcon, UserIcon, LogoutIcon, CloseIcon, LockClosedIcon, ChatBubbleLeftEllipsisIcon, CpuChipIcon, DocumentChartBarIcon, ScanIcon, StethoscopeIcon, ShieldCheckIcon } from './icons';
import { useI18n } from './I18n';
import { LanguageSelector } from './LanguageSelector';

interface SidebarProps {
  user: User;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedbackModal: () => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            }`}
        >
            {icon}
            <span className="ml-3">{label}</span>
        </button>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({ user, currentPage, onNavigate, onLogout, isOpen, onClose, onOpenFeedbackModal }) => {
    const { t } = useI18n();
    const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);
    const navSections: {
        title: string;
        items: { page: Page; label: string; icon: React.ReactNode; adminOnly?: boolean }[];
    }[] = [
        {
            title: "Main",
            items: [
                { page: 'welcome', label: t('dashboard'), icon: <HomeIcon className="w-5 h-5 text-blue-400" /> },
                { page: 'home', label: 'Home Overview', icon: <GlobeIcon className="w-5 h-5 text-slate-400" /> },
            ]
        },
        {
            title: "Health Tools",
            items: [
                { page: 'image-analysis', label: 'Scan Skin & Photos', icon: <ScanIcon className="w-5 h-5 text-cyan-400" /> },
                { page: 'symptom-checker', label: 'Check Symptoms', icon: <StethoscopeIcon className="w-5 h-5 text-emerald-400" /> },
                { page: 'prescription-analysis', label: 'Read Prescription', icon: <DocumentChartBarIcon className="w-5 h-5 text-amber-400" /> },
                { page: 'mental-health', label: 'Mood & Well-being', icon: <CpuChipIcon className="w-5 h-5 text-indigo-400" /> },
                { page: 'water-log', label: 'Water Tracker', icon: <ShieldCheckIcon className="w-5 h-5 text-teal-400" /> },
            ]
        },
        {
            title: "Neighborhood Safety",
            items: [
                { page: 'explore', label: '3D Health Globe', icon: <GlobeIcon className="w-5 h-5 text-cyan-400" /> },
                { page: 'live-alerts', label: 'Local Health Alerts', icon: <ShieldCheckIcon className="w-5 h-5 text-rose-400" /> },
            ]
        },
        {
            title: "City Help",
            items: [
                { page: 'municipal-tickets', label: 'Report an Issue', icon: <ShieldCheckIcon className="w-5 h-5 text-orange-400" /> },
                { page: 'ai-flywheel', label: 'Impact & Community Stats', icon: <CpuChipIcon className="w-5 h-5 text-purple-400" /> },
            ]
        },
        {
            title: "My Account",
            items: [
                { page: 'profile', label: t('my_profile'), icon: <UserIcon className="w-5 h-5 text-slate-300" /> },
                { page: 'activity-history', label: t('activity_history'), icon: <HistoryIcon className="w-5 h-5 text-slate-300" /> },
                { page: 'privacy-policy', label: 'Privacy & Safety', icon: <ShieldCheckIcon className="w-5 h-5 text-emerald-400" /> },
                { page: 'admin-dashboard', label: t('admin_dashboard'), icon: <LockClosedIcon className="w-5 h-5 text-red-400" />, adminOnly: true },
            ]
        }
    ];

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-white flex flex-col h-screen p-4 
                transition-transform duration-300 ease-in-out border-r border-slate-800
                md:relative md:translate-x-0 md:flex-shrink-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5 px-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                            <GlobeIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tight leading-none text-white">GeoSick AI</h1>
                            <span className="text-[10px] font-mono text-cyan-400 tracking-wider">SOVEREIGN HEALTH</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white" aria-label="Close menu">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-grow mt-4 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
                    {navSections.map((section) => {
                        const visibleItems = section.items.filter(item => !item.adminOnly || user.isAdmin);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section.title} className="space-y-1">
                                <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                    {section.title}
                                </div>
                                {visibleItems.map((item) => (
                                    <NavItem
                                        key={item.page}
                                        icon={item.icon}
                                        label={item.label}
                                        isActive={currentPage === item.page}
                                        onClick={() => {
                                            onNavigate(item.page);
                                            onClose();
                                        }}
                                    />
                                ))}
                            </div>
                        );
                    })}

                    <div className="pt-2">
                        <button
                            onClick={onOpenFeedbackModal}
                            className="flex items-center w-full px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors duration-200 text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                            <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-slate-400" />
                            <span className="ml-2.5">{t('feedback_review')}</span>
                        </button>
                    </div>

                    {/* 100% On-Device Sovereign AI Trust Badge */}
                    <div className="pt-2 px-1">
                        <button
                            onClick={() => setIsTrustModalOpen(true)}
                            className="w-full text-left bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 hover:border-blue-400 p-2.5 rounded-xl transition-all group"
                        >
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[11px] font-extrabold text-blue-200 tracking-wide uppercase">Sovereign On-Device</span>
                            </div>
                            <p className="text-[10px] text-slate-300 mt-0.5 leading-tight group-hover:text-white transition-colors">
                                🔒 100% Private: 0 bytes sent to external cloud AI
                            </p>
                        </button>
                    </div>
                </nav>
                
                <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="px-2 mb-3">
                        <label className="text-xs font-semibold text-slate-400">{t('language')}</label>
                        <LanguageSelector variant="dark" className="mt-1" />
                    </div>
                     <div className="flex items-center gap-3 p-2 rounded-lg">
                         <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
                            {user.name.charAt(0).toUpperCase()}
                         </div>
                         <div className="flex-grow min-w-0">
                             <p className="font-semibold text-sm truncate">{user.name}</p>
                             <p className="text-xs text-slate-400 truncate">{user.email || user.phone}</p>
                         </div>
                     </div>
                     <button
                        onClick={onLogout}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 text-slate-300 hover:bg-red-500/20 hover:text-red-300 mt-2"
                    >
                        <LogoutIcon className="w-5 h-5" />
                        <span className="ml-3">{t('logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Sovereign Privacy & Clinical Architecture Modal */}
            {isTrustModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative space-y-5 animate-scale-up">
                        <button
                            onClick={() => setIsTrustModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400 flex items-center justify-center text-blue-400">
                                <ShieldCheckIcon className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">GeoSick Sovereign AI Architecture</h3>
                                <p className="text-xs text-blue-300 font-mono">100% AIR-GAPPED & ON-DEVICE SECURE</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <strong className="text-white block mb-1">🛡️ Zero Cloud Data Transmission</strong>
                                <p>
                                    Your personal medical documents, prescription photos, and skin camera captures never leave your browser. All neural inference runs via WebAssembly (WASM SIMD) on local hardware.
                                </p>
                            </div>

                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <strong className="text-white block mb-1">🧠 Edge PyTorch & ONNX Weights</strong>
                                <p>
                                    Trained models (<span className="font-mono text-blue-300">GeoSick-EnvNet</span> and <span className="font-mono text-blue-300">GeoSick-DermaVector</span>) run locally at 60 FPS without sending API requests to OpenAI or Google.
                                </p>
                            </div>

                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <strong className="text-white block mb-1">📋 Peer-Reviewed Clinical Standards</strong>
                                <p>
                                    Pharmacological warnings, drug-drug contraindications, and laboratory recommendations are built strictly from World Health Organization (WHO) and Indian Council of Medical Research (ICMR) clinical management guidelines.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsTrustModalOpen(false)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
                        >
                            Understood & Verified
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
