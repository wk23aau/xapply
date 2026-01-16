import React, { useState, useRef } from 'react';
import { Upload, User, Briefcase, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { ResumeData } from '../types';

interface OnboardingWizardProps {
    onComplete: (data: ResumeData) => void;
}

type Step = 'welcome' | 'upload' | 'manual' | 'review' | 'done';

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
    const [step, setStep] = useState<Step>('welcome');
    const [isUploading, setIsUploading] = useState(false);
    const [profileData, setProfileData] = useState<ResumeData>({
        personalInfo: { name: '', title: '', address: '', phone: '', email: '' },
        summary: '',
        skills: [],
        experience: [],
        education: []
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // -------------------------
    // Handlers
    // -------------------------
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://127.0.0.1:5000/upload_resume', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setProfileData(data);
            setStep('review');
        } catch (err) {
            alert('Failed to parse resume: ' + err);
        } finally {
            setIsUploading(false);
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
        try {
            // Save profile
            await fetch('http://127.0.0.1:5000/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            // Mark onboarding complete
            await fetch('http://127.0.0.1:5000/onboarding', { method: 'POST' });
            onComplete(profileData);
        } catch (err) {
            alert('Failed to save profile: ' + err);
        }
    };

    // -------------------------
    // Render Steps
    // -------------------------
    const renderWelcome = () => (
        <div className="text-center space-y-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#6366f1] to-[#10b981] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
                <span className="text-3xl font-bold text-white">X</span>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Welcome to Xapply</h1>
                <p className="text-gray-400">Let's set up your profile in just a few steps.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <button
                    onClick={() => { fileInputRef.current?.click(); setStep('upload'); }}
                    className="bg-[#1E232F] hover:bg-[#2A303C] border border-[#2A303C] rounded-xl p-6 text-left transition-all group"
                >
                    <Upload className="text-[#818cf8] mb-3 group-hover:scale-110 transition-transform" size={28} />
                    <h3 className="text-white font-semibold mb-1">Quick Upload</h3>
                    <p className="text-gray-500 text-sm">Upload your existing CV and we'll do the rest.</p>
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
                {isUploading ? (
                    <Loader2 className="text-[#818cf8] animate-spin" size={32} />
                ) : (
                    <Upload className="text-[#818cf8]" size={32} />
                )}
            </div>
            <h2 className="text-2xl font-bold text-white">{isUploading ? 'Analyzing your CV...' : 'Upload Your Resume'}</h2>
            <p className="text-gray-400">We support PDF and image formats.</p>
            {!isUploading && (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#818cf8] hover:bg-[#6366f1] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
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
                <input
                    type="text"
                    placeholder="Full Name"
                    value={profileData.personalInfo.name}
                    onChange={(e) => handleManualChange('personalInfo.name', e.target.value)}
                    className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none"
                />
                <input
                    type="text"
                    placeholder="Professional Title (e.g., Software Engineer)"
                    value={profileData.personalInfo.title}
                    onChange={(e) => handleManualChange('personalInfo.title', e.target.value)}
                    className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={profileData.personalInfo.email}
                    onChange={(e) => handleManualChange('personalInfo.email', e.target.value)}
                    className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none"
                />
                <input
                    type="tel"
                    placeholder="Phone Number"
                    value={profileData.personalInfo.phone}
                    onChange={(e) => handleManualChange('personalInfo.phone', e.target.value)}
                    className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none"
                />
                <input
                    type="text"
                    placeholder="Location (e.g., London, UK)"
                    value={profileData.personalInfo.address}
                    onChange={(e) => handleManualChange('personalInfo.address', e.target.value)}
                    className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none"
                />
                <textarea
                    placeholder="Professional Summary"
                    value={profileData.summary}
                    onChange={(e) => handleManualChange('summary', e.target.value)}
                    rows={4}
                    className="w-full bg-[#1E232F] border border-[#2A303C] text-white px-4 py-3 rounded-lg focus:border-[#818cf8] focus:outline-none resize-none"
                />
            </div>
            <div className="flex justify-between">
                <button onClick={() => setStep('welcome')} className="text-gray-400 hover:text-white flex items-center gap-2">
                    <ArrowLeft size={16} /> Back
                </button>
                <button
                    onClick={() => setStep('review')}
                    className="bg-[#818cf8] hover:bg-[#6366f1] text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                >
                    Continue <ArrowRight size={16} />
                </button>
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
                <div>
                    <span className="text-gray-500 text-sm">Name</span>
                    <p className="text-white font-medium">{profileData.personalInfo.name || 'Not provided'}</p>
                </div>
                <div>
                    <span className="text-gray-500 text-sm">Title</span>
                    <p className="text-white font-medium">{profileData.personalInfo.title || 'Not provided'}</p>
                </div>
                <div>
                    <span className="text-gray-500 text-sm">Email</span>
                    <p className="text-white font-medium">{profileData.personalInfo.email || 'Not provided'}</p>
                </div>
                <div>
                    <span className="text-gray-500 text-sm">Summary</span>
                    <p className="text-gray-300 text-sm">{profileData.summary?.substring(0, 150) || 'Not provided'}...</p>
                </div>
            </div>
            <div className="flex justify-between">
                <button onClick={() => setStep('manual')} className="text-gray-400 hover:text-white flex items-center gap-2">
                    <ArrowLeft size={16} /> Edit
                </button>
                <button
                    onClick={handleFinish}
                    className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                >
                    Finish Setup <CheckCircle size={16} />
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
                {step === 'welcome' && renderWelcome()}
                {step === 'upload' && renderUpload()}
                {step === 'manual' && renderManual()}
                {step === 'review' && renderReview()}
            </div>
        </div>
    );
};

export default OnboardingWizard;
