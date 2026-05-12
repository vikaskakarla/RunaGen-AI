import React from 'react';
import { Skeleton } from './ui/Skeleton';

const CareerIntelligenceSkeleton: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header Skeleton */}
            <div className="text-center mb-8">
                <Skeleton className="h-10 w-64 mx-auto mb-3" />
                <Skeleton className="h-6 w-96 mx-auto" />
            </div>

            {/* Profile Summary Skeleton */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center space-y-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="flex justify-center space-x-2">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-40 rounded-lg" />
                ))}
            </div>

            {/* Main Content Area (Trajectory-like) */}
            <div className="space-y-6">
                {/* Success Card */}
                <div className="bg-white/70 rounded-2xl p-6 shadow-sm border border-white/60">
                    <div className="flex justify-between items-center mb-4">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Timeline Skeleton */}
                <div className="bg-white/70 rounded-2xl p-6 shadow-sm border border-white/60">
                    <Skeleton className="h-7 w-48 mb-6" />
                    <div className="space-y-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-6 w-48" />
                                        <Skeleton className="h-6 w-24 rounded-full" />
                                    </div>
                                    <Skeleton className="h-4 w-32" />
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <div className="flex gap-2">
                                                <Skeleton className="h-6 w-16" />
                                                <Skeleton className="h-6 w-20" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-2/3" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default CareerIntelligenceSkeleton;
