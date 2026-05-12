import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, UploadCloud, ArrowRight, History, Clock, X } from 'lucide-react';
import ATSAnalysis from './ATSAnalysis';
import CoverLetterGenerator from './CoverLetterGenerator';

const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface ResumeIntelligenceProps {
    onBadgeEarned?: (badge: any) => void;
}

const ResumeIntelligence: React.FC<ResumeIntelligenceProps> = ({ onBadgeEarned }) => {
    const [activeTab, setActiveTab] = useState<'ats' | 'coverLetter'>('ats');
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [companyName, setCompanyName] = useState('');

    // Results State
    const [atsResults, setAtsResults] = useState<any>(null);
    const [clResults, setClResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const userId = localStorage.getItem('userId');
            if (userId) headers['x-user-id'] = userId;

            console.log('Fetching history from API...');
            const res = await fetch(`${API_BASE}/api/resume/history`, { headers });
            const data = await res.json();
            console.log('History data received:', data);

            if (data.success) {
                setHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const loadHistoryItem = (item: any) => {
        if (item.type === 'ats') {
            setActiveTab('ats');
            setResumeText(item.data.resumeText);
            setJobDescription(item.data.jobDescription);
            setTargetRole(item.data.targetRole || '');
            setAtsResults({ analysis: item.data.analysis, optimization: item.data.optimization });
        } else if (item.type === 'cover-letter') {
            setActiveTab('coverLetter');
            setResumeText(item.data.resumeText);
            setJobDescription(item.data.jobDescription);
            setCompanyName(item.data.companyName);
            setTargetRole(item.data.targetRole || '');
            setClResults(item.data.generatedLetter);
        }
        setShowHistory(false);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/resume/extract-text`, {
                method: 'POST',
                headers,
                body: formData
            });

            const data = await res.json();
            if (data.success && data.text) {
                setResumeText(data.text);
            } else {
                alert('Failed to extract text: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('File upload failed:', error);
            alert('File upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleOptimize = async () => {
        if (!resumeText || !jobDescription) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const userId = localStorage.getItem('userId');
            if (userId) headers['x-user-id'] = userId;

            const res = await fetch(`${API_BASE}/api/resume/optimize`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ resumeText, jobDescription, targetRole })
            });
            const data = await res.json();
            if (data.success) {
                setAtsResults({ analysis: data.atsAnalysis, optimization: data.optimization });

                // Check if a badge was earned
                if (data.newBadges && data.newBadges.length > 0 && onBadgeEarned) {
                    onBadgeEarned(data.newBadges[0]);
                }

                // Refresh history
                fetchHistory();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateCoverLetter = async () => {
        if (!resumeText || !jobDescription || !companyName) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const userId = localStorage.getItem('userId');
            if (userId) headers['x-user-id'] = userId;

            const res = await fetch(`${API_BASE}/api/resume/cover-letter`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    resumeData: resumeText,
                    companyName,
                    jobDescription,
                    role: targetRole
                })
            });
            const data = await res.json();
            if (data.success) {
                setClResults(data.coverLetter);
                fetchHistory();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-6 md:p-8 animate-fadeIn relative overflow-hidden">
            {/* History Toggle */}
            <button
                onClick={() => setShowHistory(true)}
                className="absolute top-8 right-8 z-50 p-2 bg-white rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-all group"
                title="View History"
            >
                <History className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
            </button>

            {/* History Sidebar */}
            <div className={`absolute inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Analysis History
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">No history yet</div>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => loadHistoryItem(item)}
                                className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl cursor-pointer transition-all group"
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${item.type === 'ats' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                                        {item.type === 'ats' ? 'ATS' : 'Letter'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(item.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-indigo-700">
                                    {item.type === 'ats' ? item.data.targetRole || 'Resume Analysis' : item.data.companyName}
                                </h4>
                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    {item.type === 'ats' ? (
                                        <>Score: <span className="font-bold text-slate-700">{item.data.atsScore}</span></>
                                    ) : (
                                        <span className="line-clamp-1">{item.data.targetRole}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* Sidebar / Input Area */}
            <div className="w-full md:w-1/3 space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Input Details
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Resume Content</label>
                            <textarea
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                                className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
                                placeholder="Paste your resume text here..."
                            />
                            <p className="text-xs text-slate-400 mt-1 text-right">{resumeText.length} chars</p>

                            {/* File Upload Zone */}
                            <div
                                className={`mt-2 border-2 border-dashed rounded-xl p-4 text-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                    }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    id="resume-upload"
                                    className="hidden"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="resume-upload" className="cursor-pointer block">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center py-2">
                                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
                                            <span className="text-sm text-slate-500">Extracting text...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-slate-600">Click to upload or drag & drop</p>
                                            <p className="text-xs text-slate-400">PDF, PNG, JPG supported</p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Job Description</label>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
                                placeholder="Paste the job description..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Target Role</label>
                                <input
                                    type="text"
                                    value={targetRole}
                                    onChange={(e) => setTargetRole(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                                    placeholder="e.g. UX Designer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Company</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                                    placeholder="e.g. Google"
                                />
                            </div>
                        </div>

                        <button
                            onClick={activeTab === 'ats' ? handleOptimize : handleGenerateCoverLetter}
                            disabled={isLoading || !resumeText || !jobDescription}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 ${isLoading || !resumeText || !jobDescription
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-xl hover:shadow-indigo-300'
                                }`}
                        >
                            {isLoading ? (
                                <>Processing...</>
                            ) : activeTab === 'ats' ? (
                                <>Analyze Resume <ArrowRight className="w-4 h-4" /></>
                            ) : (
                                <>Generate Letter <Sparkles className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('ats')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'ats'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                            }`}
                    >
                        <UploadCloud className="w-4 h-4" /> ATS & Edits
                    </button>
                    <button
                        onClick={() => setActiveTab('coverLetter')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'coverLetter'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                            }`}
                    >
                        <FileText className="w-4 h-4" /> Cover Letter
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 pb-20">
                    {activeTab === 'ats' ? (
                        atsResults ? (
                            <ATSAnalysis analysis={atsResults.analysis} optimization={atsResults.optimization} />
                        ) : (
                            <EmptyState
                                title="Ready to Optimize"
                                description="Paste your resume and job description on the left to get a detailed ATS analysis and improvement suggestions."
                                icon={<UploadCloud className="w-12 h-12 text-slate-300" />}
                            />
                        )
                    ) : (
                        clResults ? (
                            <CoverLetterGenerator
                                coverLetterData={clResults}
                                onRegenerate={handleGenerateCoverLetter}
                                isLoading={isLoading}
                            />
                        ) : (
                            <EmptyState
                                title="Cover Letter Generator"
                                description="Provide the company name and your resume to generate a highly personalized cover letter in seconds."
                                icon={<FileText className="w-12 h-12 text-slate-300" />}
                            />
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) => (
    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">{title}</h3>
        <p className="text-slate-400 max-w-md mx-auto">{description}</p>
    </div>
);

export default ResumeIntelligence;
