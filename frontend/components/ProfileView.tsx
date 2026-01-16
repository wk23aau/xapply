import React, { useState, useEffect } from 'react';
import { User, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { ResumeData, Skill, Experience, Education } from '../types';

interface ProfileViewProps {
    initialData?: ResumeData;
    onSave?: (data: ResumeData) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ initialData, onSave }) => {
    const [profile, setProfile] = useState<ResumeData>(
        initialData || {
            personalInfo: { name: '', title: '', address: '', phone: '', email: '' },
            summary: '',
            skills: [],
            experience: [],
            education: []
        }
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        if (initialData) setProfile(initialData);
    }, [initialData]);

    // -------------------------
    // Save Handler
    // -------------------------
    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');
        try {
            const res = await fetch('http://127.0.0.1:5000/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            if (!res.ok) throw new Error('Failed to save');
            setSaveMessage('Profile saved successfully!');
            if (onSave) onSave(profile);
        } catch (err) {
            setSaveMessage('Error saving profile');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    // -------------------------
    // Section Handlers
    // -------------------------
    const addSkill = () => {
        setProfile(prev => ({
            ...prev,
            skills: [...prev.skills, { category: '', items: [] }]
        }));
    };

    const addExperience = () => {
        setProfile(prev => ({
            ...prev,
            experience: [...prev.experience, { company: '', location: '', role: '', dates: '', bullets: [] }]
        }));
    };

    const addEducation = () => {
        setProfile(prev => ({
            ...prev,
            education: [...prev.education, { degree: '', institution: '', location: '', dates: '', details: [] }]
        }));
    };

    // -------------------------
    // Render
    // -------------------------
    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <User className="text-[#818cf8]" size={28} />
                        <h2 className="text-2xl font-bold text-white">My Profile</h2>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-[#818cf8] hover:bg-[#6366f1] disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
                {saveMessage && (
                    <div className={`text-sm ${saveMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                        {saveMessage}
                    </div>
                )}

                {/* Personal Info Card */}
                <div className="bg-[#151A23] rounded-xl border border-[#1E232F] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={profile.personalInfo.name}
                            onChange={(e) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, name: e.target.value } }))}
                            className="bg-[#0B0E14] border border-[#1E232F] text-white px-4 py-2 rounded-lg focus:border-[#818cf8] focus:outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Professional Title"
                            value={profile.personalInfo.title}
                            onChange={(e) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, title: e.target.value } }))}
                            className="bg-[#0B0E14] border border-[#1E232F] text-white px-4 py-2 rounded-lg focus:border-[#818cf8] focus:outline-none"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={profile.personalInfo.email}
                            onChange={(e) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, email: e.target.value } }))}
                            className="bg-[#0B0E14] border border-[#1E232F] text-white px-4 py-2 rounded-lg focus:border-[#818cf8] focus:outline-none"
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            value={profile.personalInfo.phone}
                            onChange={(e) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, phone: e.target.value } }))}
                            className="bg-[#0B0E14] border border-[#1E232F] text-white px-4 py-2 rounded-lg focus:border-[#818cf8] focus:outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Location"
                            value={profile.personalInfo.address}
                            onChange={(e) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, address: e.target.value } }))}
                            className="col-span-2 bg-[#0B0E14] border border-[#1E232F] text-white px-4 py-2 rounded-lg focus:border-[#818cf8] focus:outline-none"
                        />
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-[#151A23] rounded-xl border border-[#1E232F] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Professional Summary</h3>
                    <textarea
                        placeholder="Write a brief summary of your professional background..."
                        value={profile.summary}
                        onChange={(e) => setProfile(p => ({ ...p, summary: e.target.value }))}
                        rows={4}
                        className="w-full bg-[#0B0E14] border border-[#1E232F] text-white px-4 py-2 rounded-lg focus:border-[#818cf8] focus:outline-none resize-none"
                    />
                </div>

                {/* Skills Card */}
                <div className="bg-[#151A23] rounded-xl border border-[#1E232F] p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Skills</h3>
                        <button onClick={addSkill} className="text-[#818cf8] hover:text-[#6366f1] flex items-center gap-1 text-sm">
                            <Plus size={14} /> Add Category
                        </button>
                    </div>
                    <div className="space-y-3">
                        {profile.skills.map((skill, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Category (e.g., Languages)"
                                    value={skill.category}
                                    onChange={(e) => {
                                        const newSkills = [...profile.skills];
                                        newSkills[idx].category = e.target.value;
                                        setProfile(p => ({ ...p, skills: newSkills }));
                                    }}
                                    className="w-1/3 bg-[#0B0E14] border border-[#1E232F] text-white px-3 py-2 rounded-lg text-sm focus:border-[#818cf8] focus:outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Skills (comma-separated)"
                                    value={skill.items.join(', ')}
                                    onChange={(e) => {
                                        const newSkills = [...profile.skills];
                                        newSkills[idx].items = e.target.value.split(',').map(s => s.trim());
                                        setProfile(p => ({ ...p, skills: newSkills }));
                                    }}
                                    className="flex-1 bg-[#0B0E14] border border-[#1E232F] text-white px-3 py-2 rounded-lg text-sm focus:border-[#818cf8] focus:outline-none"
                                />
                                <button
                                    onClick={() => setProfile(p => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }))}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Experience Card */}
                <div className="bg-[#151A23] rounded-xl border border-[#1E232F] p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Experience</h3>
                        <button onClick={addExperience} className="text-[#818cf8] hover:text-[#6366f1] flex items-center gap-1 text-sm">
                            <Plus size={14} /> Add Experience
                        </button>
                    </div>
                    <div className="space-y-4">
                        {profile.experience.map((exp, idx) => (
                            <div key={idx} className="bg-[#0B0E14] p-4 rounded-lg space-y-3">
                                <div className="flex justify-between">
                                    <input
                                        type="text"
                                        placeholder="Company"
                                        value={exp.company}
                                        onChange={(e) => {
                                            const newExp = [...profile.experience];
                                            newExp[idx].company = e.target.value;
                                            setProfile(p => ({ ...p, experience: newExp }));
                                        }}
                                        className="bg-transparent border-b border-[#1E232F] text-white px-0 py-1 focus:border-[#818cf8] focus:outline-none"
                                    />
                                    <button
                                        onClick={() => setProfile(p => ({ ...p, experience: p.experience.filter((_, i) => i !== idx) }))}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Role"
                                        value={exp.role}
                                        onChange={(e) => {
                                            const newExp = [...profile.experience];
                                            newExp[idx].role = e.target.value;
                                            setProfile(p => ({ ...p, experience: newExp }));
                                        }}
                                        className="bg-transparent border-b border-[#1E232F] text-gray-300 text-sm px-0 py-1 focus:border-[#818cf8] focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Location"
                                        value={exp.location}
                                        onChange={(e) => {
                                            const newExp = [...profile.experience];
                                            newExp[idx].location = e.target.value;
                                            setProfile(p => ({ ...p, experience: newExp }));
                                        }}
                                        className="bg-transparent border-b border-[#1E232F] text-gray-300 text-sm px-0 py-1 focus:border-[#818cf8] focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Dates"
                                        value={exp.dates}
                                        onChange={(e) => {
                                            const newExp = [...profile.experience];
                                            newExp[idx].dates = e.target.value;
                                            setProfile(p => ({ ...p, experience: newExp }));
                                        }}
                                        className="bg-transparent border-b border-[#1E232F] text-gray-300 text-sm px-0 py-1 focus:border-[#818cf8] focus:outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Education Card */}
                <div className="bg-[#151A23] rounded-xl border border-[#1E232F] p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Education</h3>
                        <button onClick={addEducation} className="text-[#818cf8] hover:text-[#6366f1] flex items-center gap-1 text-sm">
                            <Plus size={14} /> Add Education
                        </button>
                    </div>
                    <div className="space-y-4">
                        {profile.education.map((edu, idx) => (
                            <div key={idx} className="bg-[#0B0E14] p-4 rounded-lg space-y-3">
                                <div className="flex justify-between">
                                    <input
                                        type="text"
                                        placeholder="Degree"
                                        value={edu.degree}
                                        onChange={(e) => {
                                            const newEdu = [...profile.education];
                                            newEdu[idx].degree = e.target.value;
                                            setProfile(p => ({ ...p, education: newEdu }));
                                        }}
                                        className="bg-transparent border-b border-[#1E232F] text-white px-0 py-1 focus:border-[#818cf8] focus:outline-none"
                                    />
                                    <button
                                        onClick={() => setProfile(p => ({ ...p, education: p.education.filter((_, i) => i !== idx) }))}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Institution"
                                        value={edu.institution}
                                        onChange={(e) => {
                                            const newEdu = [...profile.education];
                                            newEdu[idx].institution = e.target.value;
                                            setProfile(p => ({ ...p, education: newEdu }));
                                        }}
                                        className="bg-transparent border-b border-[#1E232F] text-gray-300 text-sm px-0 py-1 focus:border-[#818cf8] focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Location"
                                        value={edu.location}
                                        onChange={(e) => {
                                            const newEdu = [...profile.education];
                                            newEdu[idx].location = e.target.value;
                                            setProfile(p => ({ ...p, education: newEdu }));
                                        }}
                                        className="bg-transparent border-b border-[#1E232F] text-gray-300 text-sm px-0 py-1 focus:border-[#818cf8] focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Dates"
                                        value={edu.dates}
                                        onChange={(e) => {
                                            const newEdu = [...profile.education];
                                            newEdu[idx].dates = e.target.value;
                                            setProfile(p => ({ ...p, education: newEdu }));
                                        }}
                                        className="bg-transparent border-b border-[#1E232F] text-gray-300 text-sm px-0 py-1 focus:border-[#818cf8] focus:outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
