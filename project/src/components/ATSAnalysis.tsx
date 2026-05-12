import React from 'react';
import { CheckCircle, AlertTriangle, Ban } from 'lucide-react';

interface ATSAnalysisProps {
    analysis: any;
    optimization: any;
}

const ATSAnalysis: React.FC<ATSAnalysisProps> = ({ analysis, optimization }) => {
    if (!analysis) return null;

    const score = analysis.ats_score || 0;

    // Determine score color
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-emerald-500 border-emerald-500';
        if (s >= 60) return 'text-amber-500 border-amber-500';
        return 'text-rose-500 border-rose-500';
    };

    const getProgressColor = (s: number) => {
        if (s >= 80) return 'stroke-emerald-500';
        if (s >= 60) return 'stroke-amber-500';
        return 'stroke-rose-500';
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Score Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Circular Progress (Simple SVG) */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                        <circle
                            cx="80" cy="80" r="70"
                            stroke="currentColor" strokeWidth="10" fill="transparent"
                            strokeDasharray={440}
                            strokeDashoffset={440 - (440 * score) / 100}
                            className={`${getProgressColor(score)} transition-all duration-1000 ease-out`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-black ${getScoreColor(score).split(' ')[0]}`}>{score}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ATS Score</span>
                    </div>
                </div>

                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {score >= 80 ? "Excellent! You're ready." : score >= 60 ? "Good start, but needs work." : "Critical improvements needed."}
                    </h2>
                    <p className="text-slate-500 mb-6">
                        Your resume has been analyzed against the job description.
                        {score < 60 && " It may be rejected by ATS systems before a human sees it."}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Keywords</div>
                            <div className="text-lg font-bold text-slate-700">{analysis.score_breakdown?.keyword_match || 0}/100</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Formatting</div>
                            <div className="text-lg font-bold text-slate-700">{analysis.score_breakdown?.formatting || 0}/100</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Structure</div>
                            <div className="text-lg font-bold text-slate-700">{analysis.score_breakdown?.section_structure || 0}/100</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Pass Rate</div>
                            <div className="text-lg font-bold text-slate-700">{(analysis.pass_probability || 0) * 100}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Missing Keywords */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Missing Keywords
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {analysis.keyword_analysis?.missing_keywords?.map((kw: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-sm font-medium border border-rose-100 dashed">
                                {kw}
                            </span>
                        )) || <p className="text-slate-400 italic">No critical keywords missing!</p>}
                    </div>
                </div>

                {/* Critical Issues */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Ban className="w-5 h-5 text-rose-500" />
                        Critical Formatting Issues
                    </h3>
                    <ul className="space-y-3">
                        {analysis.formatting_issues?.map((issue: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                                {issue}
                            </li>
                        )) || <p className="text-slate-400 italic">No formatting issues detected.</p>}
                    </ul>
                </div>
            </div>

            {/* Improvement Suggestions */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    Recommended Improvements
                </h3>
                <div className="space-y-4">
                    {optimization.key_improvements?.map((imp: any, i: number) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">{imp.section}</span>
                                <span className="text-xs text-indigo-600 font-bold">Optimization Suggestion</span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-red-50/50 p-3 rounded-lg border border-red-100 border-dashed">
                                    <div className="text-xs text-red-400 font-bold mb-1">ORIGINAL</div>
                                    <p className="text-sm text-slate-600 line-through opacity-70">{imp.original}</p>
                                </div>
                                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                    <div className="text-xs text-emerald-500 font-bold mb-1">OPTIMIZED</div>
                                    <p className="text-sm text-slate-800 font-medium">{imp.optimized}</p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-slate-500 italic">
                                Reason: {imp.reason}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ATSAnalysis;
