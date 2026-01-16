import React from 'react';
import { ResumeData } from '../types';

interface ResumePaperProps {
    data: ResumeData;
}

const ResumePaper: React.FC<ResumePaperProps> = ({ data }) => {
    // Shared section header style
    const sectionHeaderStyle: React.CSSProperties = {
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        borderBottom: '1px solid #d1d5db',
        marginBottom: '6px',
        paddingBottom: '3px',
        letterSpacing: '1px',
        color: '#374151',
    };

    return (
        <div
            className="resume-paper-container"
            style={{
                width: '794px', // A4 width in pixels at 96 DPI
                minHeight: '1123px', // A4 height in pixels at 96 DPI
                padding: '56px',
                backgroundColor: 'white',
                color: '#000000',
                boxSizing: 'border-box',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                lineHeight: '1.5',
                margin: '0 auto',
            }}
        >
            {/* Header - Should never break */}
            <header
                style={{
                    textAlign: 'center',
                    borderBottom: '2px solid #d1d5db',
                    paddingBottom: '16px',
                    marginBottom: '16px',
                }}
            >
                <h1
                    style={{
                        fontSize: '26px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        color: '#1f2937',
                        margin: '0 0 4px 0',
                    }}
                >
                    {data.personalInfo.name}
                </h1>
                <h2
                    style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#4b5563',
                        margin: '0 0 8px 0',
                    }}
                >
                    {data.personalInfo.title}
                </h2>
                <div style={{ fontSize: '11px', color: '#374151' }}>
                    {data.personalInfo.address} &nbsp;|&nbsp; {data.personalInfo.phone}{' '}
                    &nbsp;|&nbsp; {data.personalInfo.email}
                </div>
            </header>

            {/* Summary */}
            <section style={{ marginBottom: '14px' }}>
                <h3 style={sectionHeaderStyle}>Summary</h3>
                <p
                    style={{
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: '#1f2937',
                        textAlign: 'justify',
                        margin: 0,
                    }}
                >
                    {data.summary}
                </p>
            </section>

            {/* Key Skills */}
            <section style={{ marginBottom: '14px' }}>
                <h3 style={sectionHeaderStyle}>Key Skills</h3>
                <table
                    style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}
                >
                    <tbody>
                        {data.skills.map((skillGroup, idx) => (
                            <tr key={idx}>
                                <td
                                    style={{
                                        fontWeight: '600',
                                        width: '130px',
                                        verticalAlign: 'top',
                                        paddingBottom: '3px',
                                        color: '#1f2937',
                                    }}
                                >
                                    {skillGroup.category}:
                                </td>
                                <td style={{ color: '#1f2937', paddingBottom: '3px' }}>
                                    {skillGroup.items.join(', ')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Experience */}
            <section style={{ marginBottom: '14px' }}>
                <h3 style={sectionHeaderStyle}>Professional Experience</h3>
                {data.experience.map((exp, idx) => (
                    <div
                        key={idx}
                        className="experience-item" /* Important for page break control */
                        style={{ marginBottom: '12px' }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                            }}
                        >
                            <span
                                style={{ fontWeight: 'bold', fontSize: '13px', color: '#111827' }}
                            >
                                {exp.company}{' '}
                                <span style={{ fontWeight: 'normal', color: '#4b5563' }}>
                                    | {exp.location}
                                </span>
                            </span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '4px',
                            }}
                        >
                            <span
                                style={{
                                    fontWeight: '600',
                                    textDecoration: 'underline',
                                    fontSize: '12px',
                                    color: '#1f2937',
                                }}
                            >
                                {exp.role}
                            </span>
                            <span
                                style={{
                                    fontSize: '12px',
                                    color: '#4b5563',
                                    fontStyle: 'italic',
                                }}
                            >
                                {exp.dates}
                            </span>
                        </div>
                        {exp.description && (
                            <p
                                style={{
                                    fontSize: '12px',
                                    fontStyle: 'italic',
                                    marginBottom: '4px',
                                    color: '#374151',
                                }}
                            >
                                {exp.description}
                            </p>
                        )}
                        <ul
                            style={{
                                listStyleType: 'disc',
                                marginLeft: '18px',
                                fontSize: '12px',
                                color: '#1f2937',
                                padding: 0,
                                margin: '0 0 0 18px',
                            }}
                        >
                            {exp.bullets.map((bullet, bIdx) => {
                                const colonIndex = bullet.indexOf(':');
                                const hasBoldPart = colonIndex > 0 && colonIndex < 35;

                                return (
                                    <li key={bIdx} style={{ marginBottom: '2px' }}>
                                        {hasBoldPart ? (
                                            <>
                                                <span style={{ fontWeight: '600' }}>
                                                    {bullet.substring(0, colonIndex)}:
                                                </span>
                                                {bullet.substring(colonIndex + 1)}
                                            </>
                                        ) : (
                                            bullet
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </section>

            {/* Education */}
            <section style={{ marginBottom: '14px' }}>
                <h3 style={sectionHeaderStyle}>Education</h3>
                {data.education.map((edu, idx) => (
                    <div
                        key={idx}
                        className="education-item" /* Important for page break control */
                        style={{ marginBottom: '10px' }}
                    >
                        <div
                            style={{ fontWeight: 'bold', fontSize: '12px', color: '#111827' }}
                        >
                            {edu.degree}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#374151',
                            }}
                        >
                            <span>
                                {edu.institution} | {edu.location}
                            </span>
                            <span style={{ fontStyle: 'italic' }}>{edu.dates}</span>
                        </div>
                        {edu.details.map((detail, dIdx) => (
                            <div
                                key={dIdx}
                                style={{
                                    fontSize: '12px',
                                    marginTop: '3px',
                                    color: '#1f2937',
                                    paddingLeft: '8px',
                                    borderLeft: '2px solid #e5e7eb',
                                }}
                            >
                                {detail}
                            </div>
                        ))}
                    </div>
                ))}
            </section>

            {/* Technical Setup */}
            {data.technicalSetup && data.technicalSetup.length > 0 && (
                <section style={{ marginBottom: '14px' }}>
                    <h3 style={sectionHeaderStyle}>Technical Setup (Remote Work)</h3>
                    <ul
                        style={{
                            listStyleType: 'disc',
                            marginLeft: '18px',
                            fontSize: '12px',
                            color: '#1f2937',
                            padding: 0,
                            margin: '0 0 0 18px',
                        }}
                    >
                        {data.technicalSetup.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Additional Info */}
            {data.additionalInfo && data.additionalInfo.length > 0 && (
                <section>
                    <h3 style={sectionHeaderStyle}>Additional Information</h3>
                    <ul
                        style={{
                            listStyleType: 'disc',
                            marginLeft: '18px',
                            fontSize: '12px',
                            color: '#1f2937',
                            padding: 0,
                            margin: '0 0 0 18px',
                        }}
                    >
                        {data.additionalInfo.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
};

export default ResumePaper;
