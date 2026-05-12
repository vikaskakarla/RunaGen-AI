import React from 'react';
import { Skeleton } from './ui/Skeleton';

const BadgeShowcaseSkeleton: React.FC = () => {
    return (
        <div className="px-4 py-4 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm flex flex-col items-center">
                            <Skeleton className="h-9 w-12 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>

                {/* Badges Grid - matching the layout of 4-4-2 */}
                <div className="space-y-16">
                    {/* Row 1 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center space-y-6 px-4 py-6 w-full">
                                {/* Badge Cylinder Placeholder */}
                                <div className="relative w-40 h-40">
                                    <Skeleton className="w-full h-full rounded-full" circle />
                                </div>
                                <div className="space-y-2 flex flex-col items-center w-full">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center space-y-6 px-4 py-6 w-full">
                                <div className="relative w-40 h-40">
                                    <Skeleton className="w-full h-full rounded-full" circle />
                                </div>
                                <div className="space-y-2 flex flex-col items-center w-full">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Row 3 - 2 items */}
                    <div className="flex justify-center gap-16">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center space-y-6 px-4 py-6 w-full max-w-[250px]">
                                <div className="relative w-40 h-40">
                                    <Skeleton className="w-full h-full rounded-full" circle />
                                </div>
                                <div className="space-y-2 flex flex-col items-center w-full">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="mt-16 grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
                        <div className="flex justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-8 w-24" />
                            </div>
                            <div className="space-y-2 text-right">
                                <Skeleton className="h-3 w-10 ml-auto" />
                                <Skeleton className="h-6 w-16 ml-auto" />
                            </div>
                        </div>
                        <Skeleton className="h-24 w-full" />
                        <div className="grid grid-cols-3 gap-3">
                            <Skeleton className="h-16 rounded-lg" />
                            <Skeleton className="h-16 rounded-lg" />
                            <Skeleton className="h-16 rounded-lg" />
                        </div>
                    </div>

                    <div className="lg:col-span-3 bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex justify-between">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BadgeShowcaseSkeleton;
