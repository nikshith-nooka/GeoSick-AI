import React, { useState } from 'react';
import type { User, Page } from '../types';
import { 
    UserIcon, 
    AtSymbolIcon, 
    PhoneIcon, 
    GlobeIcon, 
    CalendarIcon, 
    IdentificationIcon, 
    LockClosedIcon, 
    CloseIcon, 
    ShieldCheckIcon,
    DocumentChartBarIcon,
    ClockIcon 
} from './icons';
import { BackButton } from './BackButton';
import { useI18n } from './I18n';
import { localDb } from '../services/localSqlDb';

const USERS_KEY = 'geosick_users';

interface ProfilePageProps {
  user: User;
  onBack: () => void;
  onUpdateUser: (updatedDetails: Partial<User>) => Promise<boolean>;
  onNavigate?: (page: Page) => void;
  onLogout?: () => void;
}

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not provided';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (e) {
        return dateString;
    }
};

const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not provided';
    try {
        return new Date(dateString).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch (e) {
        return dateString;
    }
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ 
    user, 
    onBack, 
    onUpdateUser,
    onNavigate,
    onLogout
}) => {
    const { t } = useI18n();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<User>>({
        name: user.name,
        email: user.email,
        place: user.place,
        gender: user.gender,
    });
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
    const [purgeConfirmationText, setPurgeConfirmationText] = useState('');
    const [isPurging, setIsPurging] = useState(false);

    const informedConsentTimestamp = typeof window !== 'undefined' 
        ? localStorage.getItem('geosick_informed_consent_timestamp') 
        : null;

    const handleEditToggle = () => {
        if (isEditing) {
            setFormData({
                name: user.name,
                email: user.email,
                place: user.place,
                gender: user.gender,
            });
        }
        setIsEditing(!isEditing);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        const success = await onUpdateUser(formData);
        if (success) {
            setIsEditing(false);
        } else {
            alert("Failed to save profile. Please try again.");
        }
    };

    // DISHA & GDPR Health Data Export
    const handleDownloadHealthData = () => {
        try {
            const history = JSON.parse(localStorage.getItem('geosick_activity_history') || '[]');
            const userHistory = history.filter((item: any) => !user.phone || item.userPhone === user.phone);
            const waterLogs = JSON.parse(localStorage.getItem('geosick_water_logs') || '{}');
            const tickets = localDb.getTickets().filter(t => !user.phone || t.user_phone === user.phone);

            const exportBundle = {
                export_metadata: {
                    application: "GeoSick AI Health Platform",
                    version: "2.4-production",
                    export_timestamp: new Date().toISOString(),
                    regulatory_framework: "DISHA (Digital Information Security in Healthcare Act) & GDPR Data Portability",
                    informed_consent_verified: informedConsentTimestamp || 'Legacy Patient',
                },
                patient_profile: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    date_of_birth: user.date_of_birth,
                    gender: user.gender,
                    place: user.place,
                    account_created_at: user.created_at,
                },
                clinical_triage_activity: userHistory,
                daily_hydration_and_water_logs: waterLogs,
                civic_and_sanitation_tickets: tickets
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `geosick_health_records_${user.phone || user.id}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        } catch (err) {
            alert("Failed to compile health records for export: " + String(err));
        }
    };

    // DISHA & GDPR Right to Erasure
    const executePurge = () => {
        if (purgeConfirmationText.trim().toUpperCase() !== 'DELETE') {
            alert('Please type DELETE in capital letters to confirm permanent account purge.');
            return;
        }
        setIsPurging(true);
        setTimeout(() => {
            localDb.purgeUserData(user.id, user.phone);
            setIsPurging(false);
            setIsPurgeModalOpen(false);
            if (onLogout) {
                onLogout();
            } else {
                window.location.reload();
            }
        }, 500);
    };

    return (
        <div className="w-full min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col items-center animate-fade-in bg-slate-50">
            <main className="w-full max-w-3xl mx-auto z-10 pb-16">
                <header className="mb-8">
                    <div className="mb-6">
                        <BackButton onClick={onBack} />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-9 h-9"/>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">{t('my_profile')}</h1>
                            <p className="text-slate-600 text-sm">Personal details, account security, and privacy settings.</p>
                        </div>
                    </div>
                </header>

                <div className="space-y-8">
                    {/* Card 1: Personal Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                        <div className="p-6 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800">{t('personal_details')}</h2>
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button onClick={handleEditToggle} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">{t('cancel')}</button>
                                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">{t('save_changes')}</button>
                                </div>
                            ) : (
                                <button onClick={handleEditToggle} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">{t('edit_profile')}</button>
                            )}
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            <InfoField icon={<UserIcon className="w-5 h-5"/>} label={t('full_name')} name="name" value={formData.name} isEditing={isEditing} onChange={handleInputChange} />
                            <InfoField icon={<AtSymbolIcon className="w-5 h-5"/>} label={t('email_address')} name="email" value={formData.email} isEditing={isEditing} onChange={handleInputChange} type="email" />
                            <InfoField icon={<PhoneIcon className="w-5 h-5"/>} label={t('phone_number')} value={user.phone} isEditing={false} />
                            <InfoField icon={<CalendarIcon className="w-5 h-5"/>} label={t('dob')} value={formatDate(user.date_of_birth)} isEditing={false} />
                            <InfoField icon={<GlobeIcon className="w-5 h-5"/>} label={t('place')} name="place" value={formData.place} isEditing={isEditing} onChange={handleInputChange} />
                            <InfoField as="select" icon={<IdentificationIcon className="w-5 h-5"/>} label={t('gender')} name="gender" value={formData.gender} isEditing={isEditing} onChange={handleInputChange}>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </InfoField>
                        </div>
                    </div>

                    {/* Card 2: Account Security */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                        <div className="p-6 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <LockClosedIcon className="w-5 h-5 text-slate-600" />
                                <h2 className="text-lg font-bold text-slate-800">Account Security</h2>
                            </div>
                            <button 
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                            >
                                Change Password
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600">
                            <div>
                                <span className="text-slate-400 block text-xs font-medium">Account ID</span>
                                <span className="font-mono text-slate-700 text-xs">{user.id}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-xs font-medium">Member Since</span>
                                <span>{formatDate(user.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Your Records & Privacy */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                        <div className="p-6 border-b border-slate-200/80 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
                                    <h2 className="text-lg font-bold text-slate-800">Your Records & Privacy</h2>
                                </div>
                                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    100% Private & Protected
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                You own your health data. Download your records or delete your account anytime.
                            </p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Informed Consent Status */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Health Agreement</h3>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        {informedConsentTimestamp 
                                            ? `Accepted on ${formatDateTime(informedConsentTimestamp)}`
                                            : 'Terms accepted and active'}
                                    </p>
                                </div>
                                <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-700">
                                    Active
                                </span>
                            </div>

                            {/* Data Actions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                                            <DocumentChartBarIcon className="w-5 h-5 text-blue-500" />
                                            <h3>Download Your Records</h3>
                                        </div>
                                        <p className="text-xs text-slate-600">
                                            Save a copy of all your symptom checks, photo scans, and water logs to your device.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleDownloadHealthData}
                                        className="mt-4 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <span>Download My Records</span>
                                    </button>
                                </div>

                                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-1">
                                            <span>🗑️</span>
                                            <h3>Delete Account</h3>
                                        </div>
                                        <p className="text-xs text-rose-600">
                                            Permanently delete your account and erase all your saved checks and history from this device.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setPurgeConfirmationText('');
                                            setIsPurgeModalOpen(true);
                                        }}
                                        className="mt-4 w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <span>Delete My Account & History</span>
                                    </button>
                                </div>
                            </div>

                            {/* Privacy Policy Link */}
                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={() => onNavigate && onNavigate('privacy-policy')}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                    <span>Read Our Full Privacy Policy</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Change Password Modal */}
            {isPasswordModalOpen && <ChangePasswordModal user={user} onClose={() => setIsPasswordModalOpen(false)} />}

            {/* Permanent Account Purge Modal */}
            {isPurgeModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up border border-rose-200">
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                            ⚠️
                        </div>
                        <h2 className="text-xl font-bold text-center text-slate-900">
                            Delete Your Account
                        </h2>
                        <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
                            This action will permanently delete your user profile, saved health checks, and history from this device.
                        </p>
                        
                        <div className="mt-5 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900">
                            Type <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rose-300">DELETE</span> to confirm:
                        </div>

                        <input 
                            type="text"
                            value={purgeConfirmationText}
                            onChange={(e) => setPurgeConfirmationText(e.target.value)}
                            placeholder="Type DELETE"
                            className="mt-3 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-mono uppercase focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setIsPurgeModalOpen(false)}
                                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executePurge}
                                disabled={purgeConfirmationText !== 'DELETE' || isPurging}
                                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-900/20"
                            >
                                {isPurging ? 'Purging...' : 'Permanently Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoField: React.FC<any> = ({ icon, label, name, value, isEditing, onChange, type = 'text', as = 'input', children }) => {
    const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500";
    
    return (
        <div className="flex items-start gap-4 py-2">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-500 mt-1">{icon}</div>
            <div className="flex-grow">
                <label className="text-sm font-medium text-slate-500">{label}</label>
                {isEditing ? (
                    as === 'select' ? (
                        <select name={name} value={value || ''} onChange={onChange} className={commonInputClasses}>
                            {children}
                        </select>
                    ) : (
                        <input type={type} name={name} value={value || ''} onChange={onChange} className={commonInputClasses} />
                    )
                ) : (
                    <p className="text-base font-semibold text-slate-800 break-words">{value || 'Not provided'}</p>
                )}
            </div>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ user: User, onClose: () => void }> = ({ user, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
             setError("Password must be at least 8 characters long.");
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            try {
                const allUsers: any[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                const userIndex = allUsers.findIndex(u => u.phone === user.phone);

                if (userIndex === -1 || allUsers[userIndex].password !== currentPassword) {
                    throw new Error("Your current password is not correct.");
                }

                allUsers[userIndex].password = newPassword;
                localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
                
                setSuccess("Password changed successfully!");
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(onClose, 1500);

            } catch (err: any) {
                setError(err.message || "An error occurred.");
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-slate-200">
                     <h2 className="text-lg font-bold text-slate-800">Change Password</h2>
                     <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 flex-shrink-0">
                        <CloseIcon className="w-6 h-6 text-slate-600" />
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {success && <p className="text-sm text-green-600">{success}</p>}
                    <button type="submit" disabled={isLoading} className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-md transition-all duration-300 disabled:bg-slate-400">
                        {isLoading ? 'Saving...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};
