import React from 'react';
import { Skeleton } from './ui/Skeleton';

const SimulationGridSkeleton: React.FC = () => {
    return (
        <>
            {[1, 2, 3].map((n) => (
                <div key={n} className="flex-shrink-0 w-96 snap-center">
                    <div className="bg-white/40 h-[420px] rounded-3xl p-6 flex flex-col border border-white/50 space-y-6 relative overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-10 w-24 rounded-full" />
                            <Skeleton className="h-8 w-20 rounded-full" />
                        </div>

                        {/* Title & Desc */}
                        <div className="space-y-3 mt-4">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>

                        {/* Stats/Badges */}
                        <div className="flex gap-2 mt-auto">
                            <Skeleton className="h-6 w-16 rounded-md" />
                            <Skeleton className="h-6 w-16 rounded-md" />
                            <Skeleton className="h-6 w-16 rounded-md" />
                        </div>

                        {/* Button */}
                        <Skeleton className="h-12 w-full rounded-xl mt-4" />
                    </div>
                </div>
            ))}
        </>
    );
};

export default SimulationGridSkeleton;
