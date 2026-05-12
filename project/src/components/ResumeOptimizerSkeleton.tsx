import React from 'react';
import { Skeleton } from './ui/Skeleton';

interface ResumeOptimizerSkeletonProps {
    activeTab: 'optimize' | 'ats' | 'cover';
}

const ResumeOptimizerSkeleton: React.FC<ResumeOptimizerSkeletonProps> = ({ activeTab }) => {
    if (activeTab === 'optimize') {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* ATS Score */}
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                </div>

                {/* Optimized Resume */}
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                    <div className="bg-white/50 p-6 rounded-xl border border-slate-200 shadow-inner space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                        <div className="h-4" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>

                {/* Key Improvements */}
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
                    <Skeleton className="h-7 w-48 mb-4" />
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white/60 backdrop-blur-sm shadow-sm">
                                <Skeleton className="h-5 w-32 mb-3" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Skeleton className="h-16 w-full rounded-lg" />
                                    <Skeleton className="h-16 w-full rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'ats') {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60">
                    <div className="flex items-center justify-between mb-6">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white/50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                                <Skeleton className="h-8 w-12 mb-2" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>

                    {/* Pass Probability */}
                    <Skeleton className="h-16 w-full rounded-xl mb-6" />

                    {/* Keywords */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                    </div>

                    {/* Analysis Sections */}
                    <Skeleton className="h-40 w-full rounded-xl mb-6" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (activeTab === 'cover') {
        return (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="h-10 w-20" />
                </div>

                <div className="bg-white/50 p-6 rounded-xl mb-6 border border-slate-200 shadow-inner space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className={`h-4 ${i % 2 === 0 ? 'w-full' : 'w-[95%]'}`} />
                    ))}
                    <div className="h-4" />
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className={`h-4 ${i % 2 === 0 ? 'w-full' : 'w-[90%]'}`} />
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return null;
};

export default ResumeOptimizerSkeleton;
