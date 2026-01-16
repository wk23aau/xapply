export interface SkillCategory {
    category: string;
    items: string[];
}

// Alias for component compatibility
export type Skill = SkillCategory;

export interface Experience {
    company: string;
    location: string;
    role: string;
    dates: string;
    description?: string;
    bullets: string[];
}

export interface Education {
    degree: string;
    institution: string;
    location: string;
    dates: string;
    details: string[];
}

export interface ResumeData {
    personalInfo: {
        name: string;
        title: string;
        address: string;
        phone: string;
        email: string;
    };
    summary: string;
    skills: SkillCategory[];
    experience: Experience[];
    education: Education[];
    technicalSetup?: string[];
    additionalInfo?: string[];
}
