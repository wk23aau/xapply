import React, { useState, useEffect } from 'react';
import { User, Save, Plus, Trash2, Loader2, Award, Briefcase, GraduationCap, MapPin } from 'lucide-react';
import { ResumeData } from '../types';

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
    // Components
    // -------------------------
    const SectionCard: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, action?: React.ReactNode }> = ({ title, icon, children, action }) => (
        <div className="bg-[#1C1F26]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#818cf8]/10 flex items-center justify-center text-[#818cf8]">
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                </div>
                {action}
            </div>
            {children}
        </div>
    );

    const InputField = ({ label, className = "", ...props }: any) => (
        <div className={`space-y-1.5 ${className}`}>
            {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">{label}</label>}
            <input
                className="w-full bg-[#0B0E14] border border-white/5 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#818cf8] focus:border-transparent outline-none transition-all placeholder:text-gray-600 focus:bg-[#15171b]"
                {...props}
            />
        </div>
    );

    // -------------------------
    // Save Handler
    // -------------------------
    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');
        try {
            const token = localStorage.getItem('xapply_token');
            const res = await fetch('http://127.0.0.1:5000/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
        <div className="h-full overflow-y-auto bg-[#0B0E14] custom-scrollbar">
            <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 pb-32">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 bg-[#0B0E14]/95 backdrop-blur-xl z-10 py-4 -mx-4 px-4 md:px-0 border-b border-white/5 md:border-none md:bg-transparent">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">My Profile</h1>
                        <p className="text-gray-500">Manage your master profile data.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {saveMessage && (
                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${saveMessage.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'} animate-in fade-in`}>
                                {saveMessage}
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-[#818cf8] hover:bg-[#6366f1] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Personal Info */}
                <SectionCard title="Personal Information" icon={<User size={20} />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputField
                            label="Full Name"
                            placeholder="Jane Doe"
                            value={profile.personalInfo.name}
                            onChange={(e: any) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, name: e.target.value } }))}
                        />
                        <InputField
                            label="Professional Title"
                            placeholder="Senior Software Engineer"
                            value={profile.personalInfo.title}
                            onChange={(e: any) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, title: e.target.value } }))}
                        />
                        <InputField
                            label="Email"
                            value={profile.personalInfo.email}
                            onChange={(e: any) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, email: e.target.value } }))}
                        />
                        <InputField
                            label="Phone"
                            placeholder="+1 (555) 000-0000"
                            value={profile.personalInfo.phone}
                            onChange={(e: any) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, phone: e.target.value } }))}
                        />
                        <InputField
                            label="Location"
                            placeholder="San Francisco, CA"
                            className="md:col-span-2"
                            value={profile.personalInfo.address}
                            onChange={(e: any) => setProfile(p => ({ ...p, personalInfo: { ...p.personalInfo, address: e.target.value } }))}
                        />
                    </div>
                </SectionCard>

                {/* Summary */}
                <SectionCard title="Professional Summary" icon={<Award size={20} />}>
                    <textarea
                        placeholder="Detail your professional background, key achievements, and career goals..."
                        value={profile.summary}
                        onChange={(e) => setProfile(p => ({ ...p, summary: e.target.value }))}
                        rows={6}
                        className="w-full bg-[#0B0E14] border border-white/5 text-white px-5 py-4 rounded-xl focus:ring-2 focus:ring-[#818cf8] focus:border-transparent outline-none transition-all placeholder:text-gray-600 resize-none leading-relaxed focus:bg-[#15171b]"
                    />
                </SectionCard>

                {/* Skills */}
                <SectionCard
                    title="Skills"
                    icon={<Award size={20} />}
                    action={
                        <button onClick={addSkill} className="text-[#818cf8] hover:text-[#6366f1] font-medium flex items-center gap-1.5 transition-colors bg-[#818cf8]/10 px-3 py-1.5 rounded-lg hover:bg-[#818cf8]/20">
                            <Plus size={16} /> Add Category
                        </button>
                    }
                >
                    <div className="space-y-4">
                        {profile.skills.map((skill, idx) => (
                            <div key={idx} className="flex gap-4 items-start group">
                                <div className="w-1/3">
                                    <input
                                        type="text"
                                        placeholder="Category"
                                        value={skill.category}
                                        onChange={(e) => {
                                            const newSkills = [...profile.skills];
                                            newSkills[idx].category = e.target.value;
                                            setProfile(p => ({ ...p, skills: newSkills }));
                                        }}
                                        className="w-full bg-[#0B0E14] border border-white/5 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#818cf8] outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Skills (comma-separated)"
                                        value={skill.items.join(', ')}
                                        onChange={(e) => {
                                            const newSkills = [...profile.skills];
                                            newSkills[idx].items = e.target.value.split(',').map(s => s.trim());
                                            setProfile(p => ({ ...p, skills: newSkills }));
                                        }}
                                        className="w-full bg-[#0B0E14] border border-white/5 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#818cf8] outline-none transition-all"
                                    />
                                    <button
                                        onClick={() => setProfile(p => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }))}
                                        className="absolute -right-3 -top-3 bg-[#1C1F26] text-gray-400 hover:text-red-400 p-1.5 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {profile.skills.length === 0 && (
                            <div className="text-center py-8 text-gray-500 bg-[#0B0E14]/50 rounded-xl border border-dashed border-white/10">
                                No skills added yet.
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* Experience */}
                <SectionCard
                    title="Experience"
                    icon={<Briefcase size={20} />}
                    action={
                        <button onClick={addExperience} className="text-[#818cf8] hover:text-[#6366f1] font-medium flex items-center gap-1.5 transition-colors bg-[#818cf8]/10 px-3 py-1.5 rounded-lg hover:bg-[#818cf8]/20">
                            <Plus size={16} /> Add Position
                        </button>
                    }
                >
                    <div className="space-y-6">
                        {profile.experience.map((exp, idx) => (
                            <div key={idx} className="bg-[#0B0E14]/50 p-6 rounded-2xl border border-white/5 space-y-4 group relative hover:border-white/10 transition-colors">
                                <button
                                    onClick={() => setProfile(p => ({ ...p, experience: p.experience.filter((_, i) => i !== idx) }))}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={18} />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Company"
                                        placeholder="Acme Corp"
                                        value={exp.company}
                                        onChange={(e: any) => {
                                            const newExp = [...profile.experience];
                                            newExp[idx].company = e.target.value;
                                            setProfile(p => ({ ...p, experience: newExp }));
                                        }}
                                    />
                                    <InputField
                                        label="Role"
                                        placeholder="Product Manager"
                                        value={exp.role}
                                        onChange={(e: any) => {
                                            const newExp = [...profile.experience];
                                            newExp[idx].role = e.target.value;
                                            setProfile(p => ({ ...p, experience: newExp }));
                                        }}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Location"
                                        placeholder="Remote"
                                        value={exp.location}
                                        onChange={(e: any) => {
                                            const newExp = [...profile.experience];
                                            newExp[idx].location = e.target.value;
                                            setProfile(p => ({ ...p, experience: newExp }));
                                        }}
                                    />
                                    <InputField
                                        label="Dates"
                                        placeholder="Jan 2020 - Present"
                                        value={exp.dates}
                                        onChange={(e: any) => {
                                            const newExp = [...profile.experience];
                                            newExp[idx].dates = e.target.value;
                                            setProfile(p => ({ ...p, experience: newExp }));
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Education */}
                <SectionCard
                    title="Education"
                    icon={<GraduationCap size={20} />}
                    action={
                        <button onClick={addEducation} className="text-[#818cf8] hover:text-[#6366f1] font-medium flex items-center gap-1.5 transition-colors bg-[#818cf8]/10 px-3 py-1.5 rounded-lg hover:bg-[#818cf8]/20">
                            <Plus size={16} /> Add Education
                        </button>
                    }
                >
                    <div className="space-y-6">
                        {profile.education.map((edu, idx) => (
                            <div key={idx} className="bg-[#0B0E14]/50 p-6 rounded-2xl border border-white/5 space-y-4 group relative hover:border-white/10 transition-colors">
                                <button
                                    onClick={() => setProfile(p => ({ ...p, education: p.education.filter((_, i) => i !== idx) }))}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={18} />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Degree"
                                        placeholder="BS Computer Science"
                                        value={edu.degree}
                                        onChange={(e: any) => {
                                            const newEdu = [...profile.education];
                                            newEdu[idx].degree = e.target.value;
                                            setProfile(p => ({ ...p, education: newEdu }));
                                        }}
                                    />
                                    <InputField
                                        label="Institution"
                                        placeholder="University of Technology"
                                        value={edu.institution}
                                        onChange={(e: any) => {
                                            const newEdu = [...profile.education];
                                            newEdu[idx].institution = e.target.value;
                                            setProfile(p => ({ ...p, education: newEdu }));
                                        }}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Location"
                                        placeholder="London, UK"
                                        value={edu.location}
                                        onChange={(e: any) => {
                                            const newEdu = [...profile.education];
                                            newEdu[idx].location = e.target.value;
                                            setProfile(p => ({ ...p, education: newEdu }));
                                        }}
                                    />
                                    <InputField
                                        label="Dates"
                                        placeholder="2016 - 2020"
                                        value={edu.dates}
                                        onChange={(e: any) => {
                                            const newEdu = [...profile.education];
                                            newEdu[idx].dates = e.target.value;
                                            setProfile(p => ({ ...p, education: newEdu }));
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};

export default ProfileView;
