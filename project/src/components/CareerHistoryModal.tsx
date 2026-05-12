import React, { useState, useEffect } from 'react';
import { X, Calendar, Target, TrendingUp, FileText, Clock } from 'lucide-react';

interface CareerHistoryItem {
    _id: string;
    type: 'roadmap' | 'skill-roadmap' | 'trajectory' | 'resume-optimizer';
    data: any;
    metadata: {
        companyName?: string;
        targetRole?: string;
        skillsFocused?: string[];
        duration?: string;
    };
    createdAt: string;
}

interface CareerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSelectItem: (item: CareerHistoryItem) => void;
}

const CareerHistoryModal: React.FC<CareerHistoryModalProps> = ({
    isOpen,
    onClose,
    userId,
    onSelectItem
}) => {
    const [history, setHistory] = useState<CareerHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'roadmap' | 'trajectory'>('all');

    useEffect(() => {
        if (isOpen && userId) {
            fetchHistory();
        }
    }, [isOpen, userId, filter]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const url = filter === 'all'
                ? `http://localhost:3001/career-history/${userId}`
                : `http://localhost:3001/career-history/${userId}?type=${filter}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to fetch career history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'roadmap':
            case 'skill-roadmap':
                return <Target className="w-5 h-5 text-indigo-600" />;
            case 'trajectory':
                return <TrendingUp className="w-5 h-5 text-emerald-600" />;
            default:
                return <FileText className="w-5 h-5 text-slate-600" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'roadmap':
            case 'skill-roadmap':
                return 'bg-indigo-50 border-indigo-200';
            case 'trajectory':
                return 'bg-emerald-50 border-emerald-200';
            default:
                return 'bg-slate-50 border-slate-200';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold font-outfit">Career AI History</h2>
                            <p className="text-indigo-100 mt-1">View your past roadmaps and career trajectories</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all'
                                ? 'bg-white text-indigo-600'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            All ({history.length})
                        </button>
                        <button
                            onClick={() => setFilter('roadmap')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'roadmap'
                                ? 'bg-white text-indigo-600'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            Roadmaps
                        </button>
                        <button
                            onClick={() => setFilter('trajectory')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'trajectory'
                                ? 'bg-white text-indigo-600'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            Career Paths
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600 text-lg">No history found</p>
                            <p className="text-slate-400 text-sm mt-2">
                                Generate a roadmap or career trajectory to see it here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((item) => (
                                <div
                                    key={item._id}
                                    onClick={() => onSelectItem(item)}
                                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${getTypeColor(
                                        item.type
                                    )}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="mt-1">{getTypeIcon(item.type)}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-slate-800 capitalize">
                                                        {item.type === 'roadmap' ? 'Learning Roadmap' :
                                                            item.type === 'skill-roadmap' ? 'Skill Roadmap' :
                                                                'Career Trajectory'}
                                                    </h3>
                                                    {item.metadata.companyName && (
                                                        <span className="text-xs bg-white px-2 py-1 rounded-full text-slate-600">
                                                            {item.metadata.companyName}
                                                        </span>
                                                    )}
                                                </div>

                                                {item.metadata.targetRole && (
                                                    <p className="text-sm text-slate-600 mb-2">
                                                        <strong>Role:</strong> {item.metadata.targetRole}
                                                    </p>
                                                )}

                                                {item.metadata.skillsFocused && item.metadata.skillsFocused.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {item.metadata.skillsFocused.slice(0, 5).map((skill, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="text-xs bg-white px-2 py-1 rounded-full text-slate-600"
                                                            >
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {item.metadata.skillsFocused.length > 5 && (
                                                            <span className="text-xs bg-white px-2 py-1 rounded-full text-slate-600">
                                                                +{item.metadata.skillsFocused.length - 5} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(item.createdAt)}
                                                    </div>
                                                    {item.metadata.duration && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {item.metadata.duration}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CareerHistoryModal;
