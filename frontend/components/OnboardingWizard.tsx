import React, { useState, useRef, useEffect } from 'react';
import { Upload, User, CheckCircle, ArrowRight, ArrowLeft, Loader2, Mail, Shield, Sparkles } from 'lucide-react';
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

    // Auto-focus OTP input
    const otpRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (step === 'otp') {
            setTimeout(() => otpRef.current?.focus(), 100);
        }
    }, [step]);

    // -------------------------
    // Auth Handlers
    // -------------------------
    const handleSendOtp = async () => {
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
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

            setAuthToken(data.token);
            localStorage.setItem('xapply_token', data.token);

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
    // UI Components
    // -------------------------

    // A reusable card container for consistent Apple-like styling
    const WizardCard: React.FC<{ children: React.ReactNode, title?: string, subtitle?: string }> = ({ children, title, subtitle }) => (
        <div className="w-full max-w-lg bg-[#0B0E14]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            {(title || subtitle) && (
                <div className="text-center mb-8">
                    {title && <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{title}</h1>}
                    {subtitle && <p className="text-gray-400 font-medium">{subtitle}</p>}
                </div>
            )}
            {children}
        </div>
    );

    const InputField = ({ label, ...props }: any) => (
        <div className="space-y-1.5">
            {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">{label}</label>}
            <input
                className="w-full bg-[#1C1F26] border border-white/5 text-white px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-[#818cf8] focus:border-transparent outline-none transition-all placeholder:text-gray-600 disabled:opacity-50"
                {...props}
            />
        </div>
    );

    const PrimaryButton = ({ children, isLoading, ...props }: any) => (
        <button
            disabled={isLoading || props.disabled}
            className="w-full bg-[#818cf8] hover:bg-[#6366f1] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            {...props}
        >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : children}
        </button>
    );

    const SecondaryButton = ({ children, ...props }: any) => (
        <button
            className="text-gray-400 hover:text-white px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
            {...props}
        >
            {children}
        </button>
    );

    // -------------------------
    // Render Steps
    // -------------------------
    const renderVerifyEmail = () => (
        <WizardCard
            title="Verify Your Email"
            subtitle="We'll send a code to get you started securely."
        >
            <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Shield className="text-white" size={32} />
                </div>
            </div>
            <div className="space-y-6">
                <InputField
                    autoFocus
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value.toLowerCase())}
                    onKeyDown={(e: any) => e.key === 'Enter' && handleSendOtp()}
                />
                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}
                <PrimaryButton onClick={handleSendOtp} isLoading={isLoading}>
                    Send Code
                </PrimaryButton>
            </div>
        </WizardCard>
    );

    const renderOtp = () => (
        <WizardCard
            title="Check Your Email"
            subtitle={`We sent a 6-digit code to ${email}`}
        >
            <div className="flex justify-center mb-8">
                <div className="w-16 h-16 bg-[#1E232F] rounded-full flex items-center justify-center">
                    <Mail className="text-[#818cf8]" size={28} />
                </div>
            </div>
            <div className="space-y-6">
                <input
                    ref={otpRef}
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    className="w-full bg-[#1C1F26] border border-white/5 text-center text-white text-3xl tracking-[0.5em] font-mono py-4 rounded-xl focus:ring-2 focus:ring-[#818cf8] outline-none transition-all placeholder:text-gray-700"
                    maxLength={6}
                />
                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}
                <PrimaryButton onClick={handleVerifyOtp} isLoading={isLoading} disabled={otp.length !== 6}>
                    Verify & Continue
                </PrimaryButton>
                <div className="flex justify-center pt-2">
                    <SecondaryButton onClick={() => { setStep('verify-email'); setOtp(''); setError(''); }}>
                        ← Use different email
                    </SecondaryButton>
                </div>
            </div>
        </WizardCard>
    );

    const renderWelcome = () => (
        <div className="text-center space-y-8 max-w-lg w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30 rotate-3 hover:rotate-6 transition-transform duration-500">
                <Sparkles className="text-white opaciy-90" size={40} />
            </div>
            <div>
                <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">Welcome to Xapply</h1>
                <p className="text-gray-400 text-lg">You're verified! How would you like to build your profile?</p>
            </div>

            <div className="grid gap-4">
                <button
                    onClick={() => { fileInputRef.current?.click(); setStep('upload'); }}
                    className="group relative bg-[#1E232F]/80 hover:bg-[#2A303C] backdrop-blur border border-white/5 hover:border-[#818cf8]/50 rounded-2xl p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#818cf8]/20 rounded-xl flex items-center justify-center text-[#818cf8] group-hover:bg-[#818cf8] group-hover:text-white transition-colors">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Quick Upload</h3>
                            <p className="text-gray-500 text-sm">Upload your existing CV (PDF) and we'll parse it instantly.</p>
                        </div>
                        <ArrowRight className="ml-auto text-gray-600 group-hover:text-white transition-colors" size={20} />
                    </div>
                </button>

                <button
                    onClick={() => setStep('manual')}
                    className="group relative bg-[#1E232F]/80 hover:bg-[#2A303C] backdrop-blur border border-white/5 hover:border-[#10b981]/50 rounded-2xl p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#10b981]/20 rounded-xl flex items-center justify-center text-[#10b981] group-hover:bg-[#10b981] group-hover:text-white transition-colors">
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Start Fresh</h3>
                            <p className="text-gray-500 text-sm">Fill in your details manually with our smart wizard.</p>
                        </div>
                        <ArrowRight className="ml-auto text-gray-600 group-hover:text-white transition-colors" size={20} />
                    </div>
                </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
        </div>
    );

    const renderUpload = () => (
        <WizardCard>
            <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#1E232F] rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    {isLoading && <div className="absolute inset-0 rounded-full border-2 border-[#818cf8] border-t-transparent animate-spin" />}
                    <Upload className="text-gray-400" size={32} />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                    {isLoading ? 'Analyzing Resume...' : 'Upload Your Resume'}
                </h2>
                <p className="text-gray-400 mb-8 max-w-xs mx-auto">
                    {isLoading
                        ? 'Our AI is extracting your skills and experience.'
                        : 'Supported formats: PDF, PNG, JPG'}
                </p>

                {error && <p className="text-red-400 text-sm mb-6 bg-red-500/10 py-2 rounded-lg">{error}</p>}

                {!isLoading && (
                    <div className="space-y-4">
                        <PrimaryButton onClick={() => fileInputRef.current?.click()}>
                            Choose File
                        </PrimaryButton>
                        <div className="pt-2">
                            <SecondaryButton onClick={() => setStep('welcome')}>Cancel</SecondaryButton>
                        </div>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
            </div>
        </WizardCard>
    );

    const renderManual = () => (
        <div className="w-full max-w-2xl bg-[#0B0E14] md:bg-[#0B0E14]/90 md:backdrop-blur-xl md:border md:border-white/10 rounded-3xl md:shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-white/5 bg-[#0B0E14]">
                <h2 className="text-2xl font-bold text-white text-center">Your Profile Basics</h2>
                <p className="text-center text-gray-500 text-sm mt-1">Let's get the foundation right.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField label="Full Name" placeholder="Jane Doe" value={profileData.personalInfo.name} onChange={(e: any) => handleManualChange('personalInfo.name', e.target.value)} />
                    <InputField label="Professional Title" placeholder="Senior Designer" value={profileData.personalInfo.title} onChange={(e: any) => handleManualChange('personalInfo.title', e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField label="Email Address" value={profileData.personalInfo.email} disabled className="opacity-60 cursor-not-allowed" />
                    <InputField label="Phone" placeholder="+1 (555) 000-0000" value={profileData.personalInfo.phone} onChange={(e: any) => handleManualChange('personalInfo.phone', e.target.value)} />
                </div>

                <InputField label="Location" placeholder="San Francisco, CA" value={profileData.personalInfo.address} onChange={(e: any) => handleManualChange('personalInfo.address', e.target.value)} />

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Professional Summary</label>
                    <textarea
                        placeholder="Briefly describe your experience and goals..."
                        value={profileData.summary}
                        onChange={(e) => handleManualChange('summary', e.target.value)}
                        rows={5}
                        className="w-full bg-[#1C1F26] border border-white/5 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#818cf8] focus:border-transparent outline-none transition-all placeholder:text-gray-600 resize-none leading-relaxed"
                    />
                </div>
            </div>

            <div className="p-6 md:p-8 border-t border-white/5 bg-[#0B0E14] flex justify-between items-center z-10">
                <SecondaryButton onClick={() => setStep('welcome')}><ArrowLeft size={16} /> Back</SecondaryButton>
                <div className="w-1/2 md:w-auto">
                    <PrimaryButton onClick={() => setStep('review')}>Continue <ArrowRight size={18} /></PrimaryButton>
                </div>
            </div>
        </div>
    );

    const renderReview = () => (
        <div className="w-full max-w-2xl bg-[#0B0E14] md:bg-[#0B0E14]/90 md:backdrop-blur-xl md:border md:border-white/10 rounded-3xl md:shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center border-b border-white/5 bg-[#0B0E14]">
                <div className="w-16 h-16 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#10b981]">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white">Review Profile</h2>
                <p className="text-gray-400">Does this look correct?</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="bg-[#1C1F26] rounded-2xl p-6 space-y-4 border border-white/5">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5 text-sm">
                        <div className="text-gray-400">Name</div><div className="text-white font-medium text-right">{profileData.personalInfo.name}</div>
                        <div className="text-gray-400">Title</div><div className="text-white font-medium text-right">{profileData.personalInfo.title}</div>
                        <div className="text-gray-400">Email</div><div className="text-white font-medium text-right">{profileData.personalInfo.email}</div>
                        <div className="text-gray-400">Location</div><div className="text-white font-medium text-right">{profileData.personalInfo.address || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-sm mb-2">Summary</div>
                        <p className="text-gray-200 text-sm leading-relaxed bg-[#15171b] p-4 rounded-lg">
                            {profileData.summary || 'No summary provided.'}
                        </p>
                    </div>
                </div>

                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}
            </div>

            <div className="p-8 border-t border-white/5 bg-[#0B0E14] flex justify-between items-center z-10">
                <SecondaryButton onClick={() => setStep('manual')}>Edit Details</SecondaryButton>
                <div className="w-1/2 md:w-auto">
                    <button
                        onClick={handleFinish}
                        disabled={isLoading}
                        className="w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <div className="flex items-center gap-2"><CheckCircle size={20} /> Finish Setup</div>}
                    </button>
                </div>
            </div>
        </div>
    );

    // -------------------------
    // Main Render
    // -------------------------
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 overflow-hidden">
            {step === 'verify-email' && renderVerifyEmail()}
            {step === 'otp' && renderOtp()}
            {step === 'welcome' && renderWelcome()}
            {step === 'upload' && renderUpload()}
            {step === 'manual' && renderManual()}
            {step === 'review' && renderReview()}
        </div>
    );
};

export default OnboardingWizard;
