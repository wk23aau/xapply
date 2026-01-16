import React, { useState, useRef } from 'react';
import { Upload, User, CheckCircle, ArrowRight, ArrowLeft, Loader2, Mail, Shield } from 'lucide-react';
import { ResumeData } from '../types';

interface OnboardingWizardProps {
    onComplete: (data: ResumeData, token: string) => void;
}

type Step = 'verify-email' | 'otp' | 'welcome' | 'upload' | 'manual' | 'review';

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
    const [step, setStep] = useState<Step>('verify-email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [profileData, setProfileData] = useState<ResumeData>({
        personalInfo: { name: '', title: '', address: '', phone: '', email: '' },
        summary: '',
        skills: [],
        experience: [],
        education: []
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // -------------------------
    // Auth Handlers
    // -------------------------
    const handleSendOtp = async () => {
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('http://127.0.0.1:5000/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            setStep('otp');
        } catch (err: any) {
            setError(err.message || 'Failed to send verification code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('http://127.0.0.1:5000/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            // Store token
            setAuthToken(data.token);
            localStorage.setItem('xapply_token', data.token);

            // Pre-fill email in profile
            setProfileData(prev => ({
                ...prev,
                personalInfo: { ...prev.personalInfo, email }
            }));

            setStep('welcome');
        } catch (err: any) {
            setError(err.message || 'Invalid or expired code');
        } finally {
            setIsLoading(false);
        }
    };

    // -------------------------
    // Profile Handlers
    // -------------------------
    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken || localStorage.getItem('xapply_token')}`
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://127.0.0.1:5000/upload_resume', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken || localStorage.getItem('xapply_token')}` },
                body: formData,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setProfileData(data);
            setStep('review');
        } catch (err: any) {
            setError(err.message || 'Failed to parse resume');
        } finally {
            setIsLoading(false);
            e.target.value = '';
        }
    };

    const handleManualChange = (field: string, value: string) => {
        if (field.startsWith('personalInfo.')) {
            const key = field.split('.')[1];
            setProfileData(prev => ({
                ...prev,
                personalInfo: { ...prev.personalInfo, [key]: value }
            }));
        } else {
            setProfileData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleFinish = async () => {
        setIsLoading(true);
        try {
            await fetch('http://127.0.0.1:5000/profile', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(profileData)
            });
            await fetch('http://127.0.0.1:5000/onboarding', {
                method: 'POST',
                headers: getAuthHeaders()
            });
            onComplete(profileData, authToken || localStorage.getItem('xapply_token') || '');
        } catch (err: any) {
            setError(err.message || 'Failed to save profile');
        } finally {
            setIsLoading(false);
        }
    };

    // -------------------------
    // Render Steps
    // -------------------------
    const renderVerifyEmail = () => (
        <div className="text-center space-y-6 max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
                <Shield className="text-white" size={36} />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Verify Your Email</h1>
                <p className="text-gray-400">We'll send a verification code to get you started securely.</p>
            </div>
            <div className="space-y-4">
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none text-center"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="w-full bg-[#818cf8] hover:bg-[#6366f1] disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                    Send Verification Code
                </button>
            </div>
        </div>
    );

    const renderOtp = () => (
        <div className="text-center space-y-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-[#1E232F] rounded-full flex items-center justify-center mx-auto">
                <Mail className="text-[#818cf8]" size={32} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
                <p className="text-gray-400">We sent a 6-digit code to <span className="text-white">{email}</span></p>
            </div>
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                    onClick={handleVerifyOtp}
                    disabled={isLoading || otp.length !== 6}
                    className="w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    Verify & Continue
                </button>
                <button onClick={() => { setStep('verify-email'); setOtp(''); setError(''); }} className="text-gray-400 hover:text-white text-sm">
                    ← Use different email
                </button>
            </div>
        </div>
    );

    const renderWelcome = () => (
        <div className="text-center space-y-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
                <span className="text-3xl font-bold text-white">X</span>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Welcome to Xapply</h1>
                <p className="text-gray-400">You're verified! Let's set up your profile.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <button
                    onClick={() => { fileInputRef.current?.click(); setStep('upload'); }}
                    className="bg-[#1E232F] hover:bg-[#2A303C] border border-[#2A303C] rounded-xl p-6 text-left transition-all group"
                >
                    <Upload className="text-[#818cf8] mb-3 group-hover:scale-110 transition-transform" size={28} />
                    <h3 className="text-white font-semibold mb-1">Quick Upload</h3>
                    <p className="text-gray-500 text-sm">Upload your CV and we'll parse it.</p>
                </button>
                <button
                    onClick={() => setStep('manual')}
                    className="bg-[#1E232F] hover:bg-[#2A303C] border border-[#2A303C] rounded-xl p-6 text-left transition-all group"
                >
                    <User className="text-[#10b981] mb-3 group-hover:scale-110 transition-transform" size={28} />
                    <h3 className="text-white font-semibold mb-1">Start Fresh</h3>
                    <p className="text-gray-500 text-sm">Enter your details manually.</p>
                </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
        </div>
    );

    const renderUpload = () => (
        <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-[#1E232F] rounded-full flex items-center justify-center mx-auto">
                {isLoading ? <Loader2 className="text-[#818cf8] animate-spin" size={32} /> : <Upload className="text-[#818cf8]" size={32} />}
            </div>
            <h2 className="text-2xl font-bold text-white">{isLoading ? 'Analyzing your CV...' : 'Upload Your Resume'}</h2>
            <p className="text-gray-400">We support PDF and image formats.</p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {!isLoading && (
                <button onClick={() => fileInputRef.current?.click()} className="bg-[#818cf8] hover:bg-[#6366f1] text-white px-6 py-3 rounded-lg font-medium">
                    Choose File
                </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
        </div>
    );

    const renderManual = () => (
        <div className="space-y-6 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-white text-center">Your Basic Info</h2>
            <div className="space-y-4">
                <input type="text" placeholder="Full Name" value={profileData.personalInfo.name} onChange={(e) => handleManualChange('personalInfo.name', e.target.value)} className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none" />
                <input type="text" placeholder="Professional Title" value={profileData.personalInfo.title} onChange={(e) => handleManualChange('personalInfo.title', e.target.value)} className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none" />
                <input type="email" placeholder="Email" value={profileData.personalInfo.email} onChange={(e) => handleManualChange('personalInfo.email', e.target.value)} className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none" disabled />
                <input type="tel" placeholder="Phone Number" value={profileData.personalInfo.phone} onChange={(e) => handleManualChange('personalInfo.phone', e.target.value)} className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none" />
                <input type="text" placeholder="Location" value={profileData.personalInfo.address} onChange={(e) => handleManualChange('personalInfo.address', e.target.value)} className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none" />
                <textarea placeholder="Professional Summary" value={profileData.summary} onChange={(e) => handleManualChange('summary', e.target.value)} rows={4} className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none resize-none" />
            </div>
            <div className="flex justify-between">
                <button onClick={() => setStep('welcome')} className="text-gray-400 hover:text-white flex items-center gap-2"><ArrowLeft size={16} /> Back</button>
                <button onClick={() => setStep('review')} className="bg-[#818cf8] hover:bg-[#6366f1] text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2">Continue <ArrowRight size={16} /></button>
            </div>
        </div>
    );

    const renderReview = () => (
        <div className="space-y-6 max-w-lg mx-auto">
            <div className="text-center">
                <CheckCircle className="text-[#10b981] mx-auto mb-4" size={48} />
                <h2 className="text-2xl font-bold text-white">Looking Good!</h2>
                <p className="text-gray-400">Here's a quick preview of your profile.</p>
            </div>
            <div className="bg-[#1E232F] rounded-xl p-6 space-y-4">
                <div><span className="text-gray-500 text-sm">Name</span><p className="text-white font-medium">{profileData.personalInfo.name || 'Not provided'}</p></div>
                <div><span className="text-gray-500 text-sm">Title</span><p className="text-white font-medium">{profileData.personalInfo.title || 'Not provided'}</p></div>
                <div><span className="text-gray-500 text-sm">Email</span><p className="text-white font-medium">{profileData.personalInfo.email || 'Not provided'}</p></div>
                <div><span className="text-gray-500 text-sm">Summary</span><p className="text-gray-300 text-sm">{profileData.summary?.substring(0, 150) || 'Not provided'}...</p></div>
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <div className="flex justify-between">
                <button onClick={() => setStep('manual')} className="text-gray-400 hover:text-white flex items-center gap-2"><ArrowLeft size={16} /> Edit</button>
                <button onClick={handleFinish} disabled={isLoading} className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2">
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Finish Setup
                </button>
            </div>
        </div>
    );

    // -------------------------
    // Main Render
    // -------------------------
    return (
        <div className="fixed inset-0 bg-[#0B0E14] z-50 flex items-center justify-center p-8">
            <div className="w-full max-w-2xl">
                {step === 'verify-email' && renderVerifyEmail()}
                {step === 'otp' && renderOtp()}
                {step === 'welcome' && renderWelcome()}
                {step === 'upload' && renderUpload()}
                {step === 'manual' && renderManual()}
                {step === 'review' && renderReview()}
            </div>
        </div>
    );
};

export default OnboardingWizard;
