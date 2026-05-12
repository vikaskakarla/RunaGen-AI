import React from 'react';
import { Skeleton } from './ui/Skeleton';

const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-dark p-6 rounded-2xl border border-white/10 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className="h-12 w-12 rounded-xl" />
                            <div className="h-2 w-2 rounded-full bg-white/20" />
                        </div>
                        <Skeleton className="h-8 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity Skeleton */}
                <div className="glass-dark rounded-3xl p-8 border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6" />
                            <Skeleton className="h-6 w-40" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Goals Skeleton */}
                <div className="glass-dark rounded-3xl p-8 border border-white/10 shadow-xl">
                    <div className="flex items-center gap-2 mb-8">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-32" />
                    </div>

                    <div className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-4 w-10" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex items-start gap-4">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardSkeleton;
