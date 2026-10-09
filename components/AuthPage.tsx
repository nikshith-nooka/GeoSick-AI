import React, { useState } from 'react';
import { CloseIcon, GlobeIcon, PhoneIcon, LockClosedIcon, UserIcon, CalendarIcon, AtSymbolIcon } from './icons';
import RotatingGlobe from './RotatingGlobe';
import type { User } from '../types';
import { hybridDb as localDb } from '../services/hybridDb';
import { validatePasswordStrength, checkRateLimit } from '../services/securityService';

interface AuthPageProps {
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

type ViewMode = 'login' | 'signup';

export const AuthPage: React.FC<AuthPageProps> = ({ onClose, onAuthSuccess }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email or Phone
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [place, setPlace] = useState('');
  
  const [error, setError] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const resetForms = () => {
    setPhone('');
    setPassword('');
    setError('');
    setInfoMessage('');
    setName('');
    setDateOfBirth('');
    setConfirmPassword('');
    setLoginIdentifier('');
    setEmail('');
    setGender('');
    setPlace('');
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const identifier = loginIdentifier.trim();
    const rateCheck = checkRateLimit(identifier);
    if (!rateCheck.allowed) {
        setError(`Security Lockout: Too many failed attempts. Please wait ${rateCheck.remainingSeconds} seconds before trying again.`);
        return;
    }

    setIsLoading(true);

    try {
        const { user, error: authError } = await localDb.signIn(identifier, password);

        if (authError || !user) {
            throw authError || new Error("Invalid login credentials.");
        }

        onAuthSuccess(user);
    } catch (err: any) {
        console.error("Login error:", err);
        setError(err.message || "Invalid credentials.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    if (!name.trim() || (!phone.trim() && !email.trim()) || !dateOfBirth || !password) {
        setError("Please fill out all required fields.");
        return;
    }

    // Age 18+ Verification
    const birthDate = new Date(dateOfBirth);
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (isNaN(calculatedAge) || calculatedAge < 18) {
        setError("Age Requirement: You must be at least 18 years old to create an account.");
        return;
    }

    if (!agreedToTerms) {
        setError("Please accept the Terms and Privacy Policy to proceed.");
        return;
    }

    const passCheck = validatePasswordStrength(password);
    if (!passCheck.isValid) {
        setError(`Please choose a stronger password: ${passCheck.feedback.join(', ')}.`);
        return;
    }

    setIsLoading(true);
    
    try {
        const { user, error: signupError } = await localDb.signUp({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            dob: dateOfBirth,
            gender: gender,
            place: place.trim(),
            password: password
        });

        if (signupError || !user) {
            throw signupError || new Error("Failed to create account.");
        }

        onAuthSuccess(user);
    } catch (err: any) {
         console.error("Signup error:", err);
         setError(err.message || "An error occurred during account creation.");
    } finally {
         setIsLoading(false);
    }
  };
  
  const inputClasses = "w-full pl-11 pr-3 py-3 bg-white border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
  const buttonClasses = "w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-md transition-all duration-300 shadow-sm hover:shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed";

  const passwordStrength = validatePasswordStrength(password);

  const renderSignUpForm = () => (
     <form onSubmit={handleSignUp} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="name-signup" className="sr-only">Full Name</label>
                <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input id="name-signup" type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClasses} placeholder="Full Name *" />
                </div>
            </div>
            <div>
                <label htmlFor="dob-signup" className="sr-only">Date of Birth</label>
                <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input id="dob-signup" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required className={inputClasses} />
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="email-signup" className="sr-only">Email Address</label>
                <div className="relative">
                    <AtSymbolIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input id="email-signup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} placeholder="Email Address (Optional)" />
                </div>
            </div>
            <div>
                <label htmlFor="phone-signup" className="sr-only">Phone Number</label>
                <div className="relative">
                    <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input id="phone-signup" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClasses} placeholder="Phone Number (Optional)" />
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="place-signup" className="sr-only">Place</label>
                <div className="relative">
                    <GlobeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input id="place-signup" type="text" value={place} onChange={(e) => setPlace(e.target.value)} className={inputClasses} placeholder="Place (City, State)" />
                </div>
            </div>
            <div>
                 <label htmlFor="gender-signup" className="sr-only">Gender</label>
                 <select id="gender-signup" value={gender} onChange={(e) => setGender(e.target.value)} className={`${inputClasses} pl-4`}>
                    <option value="">Select Gender (Optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                </select>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="password-signup" className="sr-only">Password</label>
                <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClasses} placeholder="Password *" />
                </div>
            </div>
             <div>
                <label htmlFor="confirm-password-signup" className="sr-only">Confirm Password</label>
                <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input id="confirm-password-signup" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClasses} placeholder="Confirm Password *" />
                </div>
            </div>
        </div>

        {/* Live Password Entropy Indicator */}
        {password.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Password Strength:</span>
                    <span className={`font-bold ${
                        passwordStrength.score >= 3 ? 'text-emerald-600' : passwordStrength.score === 2 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                        {passwordStrength.label}
                    </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`} 
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                    />
                </div>
                {passwordStrength.feedback.length > 0 && (
                    <ul className="text-[11px] text-slate-500 space-y-0.5 list-disc pl-4">
                        {passwordStrength.feedback.map((fb, idx) => (
                            <li key={idx}>{fb}</li>
                        ))}
                    </ul>
                )}
            </div>
        )}

        {/* Statutory Compliance Agreement */}
        <div className="flex items-start gap-2.5 pt-1 text-left">
            <input 
                id="terms-signup"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="terms-signup" className="text-xs text-slate-600 leading-snug cursor-pointer">
                I confirm I am 18+ years of age and agree to the{' '}
                <span className="text-blue-600 font-semibold underline">Terms & Privacy Policy</span>.
            </label>
        </div>

        <button type="submit" disabled={isLoading} className={buttonClasses}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
    </form>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
        <div>
            <label htmlFor="login-identifier" className="sr-only">Phone Number or Email</label>
            <div className="relative">
                <AtSymbolIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input id="login-identifier" type="text" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} required className={inputClasses} placeholder="Phone or Email" />
            </div>
        </div>
        <div>
            <label htmlFor="password-input" className="sr-only">Password</label>
            <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input id="password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClasses} placeholder="Password" />
            </div>
        </div>
        <div className="text-right">
            <button type="button" onClick={() => setError('Contact support or enter your registered email/phone.')} className="text-sm text-blue-600 hover:underline font-medium">
                Forgot Password?
            </button>
        </div>
        <button type="submit" disabled={isLoading} className={buttonClasses}>
            {isLoading ? 'Logging In...' : 'Login Securely'}
        </button>

        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <p className="text-xs text-slate-500 font-medium text-center">Quick Demo Credentials (1-Click Fill):</p>
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setLoginIdentifier('admin@geosick.org');
                        setPassword('admin');
                        setError('');
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-medium transition-colors border border-slate-200 text-center"
                >
                    👤 Admin (<code className="text-slate-900 font-bold">admin@geosick.org</code>)
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setLoginIdentifier('nookanikshithllpsdsnr@gmail.com');
                        setPassword('nooka@nikki123');
                        setError('');
                    }}
                    className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-lg font-medium transition-colors border border-blue-200 text-center"
                >
                    👑 Owner (<code className="text-blue-900 font-bold">Nikshith</code>)
                </button>
            </div>
        </div>
    </form>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md lg:max-w-4xl flex flex-col lg:grid lg:grid-cols-2 animate-fade-in-up overflow-hidden max-h-[90vh] lg:max-h-none">
        <div className="flex flex-col items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-blue-600 to-slate-800 text-white relative order-first">
            <div className="absolute inset-0 z-0 h-full w-full opacity-50"><RotatingGlobe /></div>
            <div className="z-10 text-center">
                <GlobeIcon className="w-16 h-16 lg:w-20 lg:h-20 text-white mx-auto mb-4"/>
                <h2 className="text-2xl lg:text-3xl font-bold">GeoSick</h2>
                <p className="mt-2 text-blue-200 text-sm lg:text-base">AI-Powered Environmental Health Intelligence.</p>
            </div>
        </div>
        <div className="p-8 sm:p-12 relative overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10" aria-label="Close authentication"><CloseIcon className="w-6 h-6" /></button>
            <div className="w-full flex border-b border-slate-200 mb-8">
                 <button onClick={() => { setViewMode('login'); resetForms(); }} className={`flex-1 text-center font-semibold pb-3 border-b-2 transition-colors ${viewMode === 'login' ? 'text-slate-800 border-blue-500' : 'text-slate-400 border-transparent hover:border-slate-300'}`}>
                    Login
                </button>
                 <button onClick={() => { setViewMode('signup'); resetForms(); }} className={`flex-1 text-center font-semibold pb-3 border-b-2 transition-colors ${viewMode === 'signup' ? 'text-slate-800 border-blue-500' : 'text-slate-400 border-transparent hover:border-slate-300'}`}>
                    Sign Up
                </button>
            </div>
            
            {viewMode === 'login' && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
                    <p className="text-slate-500 mt-1 mb-6">Login to access your dashboard.</p>
                    {renderLoginForm()}
                </div>
            )}

            {viewMode === 'signup' && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-slate-900">Create an Account</h2>
                     {infoMessage ? (
                         <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-md mt-1 mb-6">{infoMessage}</p>
                    ) : (
                        <p className="text-slate-500 mt-1 mb-6">Get started with GeoSick's full suite of tools.</p>
                    )}
                    {renderSignUpForm()}
                </div>
            )}

            {error && <div className="text-sm text-red-600 text-center pt-4">{error}</div>}
        </div>
      </div>
    </div>
  );
};
