import React from 'react';
import { Youtube, Zap, Star } from 'lucide-react';
import YouTubeVideoCard from './YouTubeVideoCard';

interface RoadmapDisplayProps {
    roadmap: any;
    title?: string;
    embedded?: boolean;
}

const RoadmapDisplay: React.FC<RoadmapDisplayProps> = ({ roadmap, title, embedded = false }) => {
    if (!roadmap) return null;

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'low': return 'bg-green-500/10 text-green-400 border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const buildYouTubeFallbackVideos = (topic: string, limit: number = 2) => {
        return Array(limit).fill(0).map((_, i) => ({
            title: `${topic} - Part ${i + 1}`,
            topic: topic,
            search_query: `${topic} tutorial`,
            duration: '10:00'
        }));
    };

    return (
        <div className={`${embedded ? '' : 'bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-indigo-100/40 border border-white/60'}`}>
            <h3 className="text-xl font-semibold text-slate-800 font-outfit mb-6 flex items-center">
                <Zap className="h-6 w-6 mr-2 text-indigo-500" />
                {title || 'Learning Roadmap'}
            </h3>

            {/* Stage 1: Critical Gaps */}
            {roadmap.stage_1_critical_gaps && roadmap.stage_1_critical_gaps.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                        <span className="mr-2">🔥</span> Stage 1: Critical Gaps <span className="text-sm font-normal text-slate-500 ml-2">(1-2 months)</span>
                    </h4>
                    <div className="space-y-3">
                        {roadmap.stage_1_critical_gaps.map((skill: any, index: number) => (
                            <div key={index} className="p-4 bg-rose-500/5 border border-rose-100 rounded-xl hover:bg-rose-500/10 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-slate-800 font-outfit">{skill.skill}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(skill.priority)}`}>
                                        {skill.priority} priority
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-2">Timeline: {skill.timeline}</p>

                                {/* YouTube Videos */}
                                <div className="mb-3">
                                    <div className="flex items-center mb-2">
                                        <Youtube className="h-4 w-4 text-rose-500 mr-1" />
                                        <p className="text-sm font-medium text-slate-600">Learning Videos</p>
                                    </div>
                                    <div className="space-y-2">
                                        {(skill.youtube_videos && skill.youtube_videos.length > 0 ? skill.youtube_videos.slice(0, 2) : buildYouTubeFallbackVideos(skill.skill)).map((video: any, i: number) => (
                                            <YouTubeVideoCard key={i} video={video} compact={true} />
                                        ))}
                                    </div>
                                </div>

                                {/* Projects */}
                                {skill.projects && skill.projects.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 mb-1">🛠️ Projects:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {skill.projects.slice(0, 2).map((project: any, i: number) => (
                                                <span key={i} className="text-xs bg-green-500/10 text-green-600 border border-green-200 px-2 py-1 rounded">
                                                    {project.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stage 2: Important Gaps */}
            {roadmap.stage_2_important_gaps && roadmap.stage_2_important_gaps.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                        <span className="mr-2">⚠️</span> Stage 2: Important Gaps <span className="text-sm font-normal text-slate-500 ml-2">(3-6 months)</span>
                    </h4>
                    <div className="space-y-3">
                        {roadmap.stage_2_important_gaps.map((skill: any, index: number) => (
                            <div key={index} className="p-4 bg-yellow-500/5 border border-yellow-100 rounded-xl hover:bg-yellow-500/10 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-slate-800 font-outfit">{skill.skill}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(skill.priority)}`}>
                                        {skill.priority} priority
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-2">Timeline: {skill.timeline}</p>

                                <div className="mb-3">
                                    <div className="flex items-center mb-2">
                                        <Youtube className="h-4 w-4 text-yellow-500 mr-1" />
                                        <p className="text-sm font-medium text-slate-600">Learning Videos</p>
                                    </div>
                                    <div className="space-y-2">
                                        {(skill.youtube_videos && skill.youtube_videos.length > 0 ? skill.youtube_videos.slice(0, 2) : buildYouTubeFallbackVideos(skill.skill)).map((video: any, i: number) => (
                                            <YouTubeVideoCard key={i} video={video} compact={true} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stage 3: Nice to have */}
            {roadmap.stage_3_nice_to_have && roadmap.stage_3_nice_to_have.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                        <span className="mr-2">✨</span> Stage 3: Future Objectives <span className="text-sm font-normal text-slate-500 ml-2">(6-12 months)</span>
                    </h4>
                    <div className="space-y-3">
                        {roadmap.stage_3_nice_to_have.map((skill: any, index: number) => (
                            <div key={index} className="p-4 bg-green-500/5 border border-green-100 rounded-xl hover:bg-green-500/10 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-slate-800 font-outfit">{skill.skill}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(skill.priority)}`}>
                                        {skill.priority} priority
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-2">Timeline: {skill.timeline}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Learning Resources */}
            {roadmap.learning_resources && (
                <div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                        <Star className="h-5 w-5 mr-2 text-indigo-400" />
                        Top Resources
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        {roadmap.learning_resources.platforms && (
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <p className="text-xs font-bold text-indigo-900 mb-1">Recommended Platforms</p>
                                <div className="flex flex-wrap gap-1">
                                    {roadmap.learning_resources.platforms.slice(0, 3).map((p: string, i: number) => (
                                        <span key={i} className="text-[10px] bg-white border border-indigo-200 px-1.5 py-0.5 rounded text-indigo-600 font-medium">{p}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {roadmap.learning_resources.books && (
                            <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                                <p className="text-xs font-bold text-violet-900 mb-1">Essential Reading</p>
                                <div className="flex flex-wrap gap-1">
                                    {roadmap.learning_resources.books.slice(0, 2).map((b: string, i: number) => (
                                        <span key={i} className="text-[10px] bg-white border border-violet-200 px-1.5 py-0.5 rounded text-violet-600 font-medium truncate max-w-full">{b}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoadmapDisplay;
