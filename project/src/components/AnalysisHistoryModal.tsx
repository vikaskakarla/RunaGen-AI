import React, { useState, useEffect } from 'react';
import { Calendar, ChevronRight, FileText, X } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface AnalysisSummary {
    _id: string;
    target_role: string;
    match_score: number;
    created_at: string;
    model_used: string;
}

interface AnalysisHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAnalysis: (analysisId: string) => void;
    currentAnalysisId?: string;
}

const AnalysisHistoryModal: React.FC<AnalysisHistoryModalProps> = ({
    isOpen,
    onClose,
    onSelectAnalysis,
    currentAnalysisId
}) => {
    const [history, setHistory] = useState<AnalysisSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

            const res = await fetch(`${API_BASE}/api/user/analyses`, { headers });
            const data = await res.json();

            if (data.success) {
                setHistory(data.analyses);
            }
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 font-outfit">Analysis History</h2>
                        <p className="text-sm text-slate-500">View past resume scans and career reports</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 flex-1 space-y-3 bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center p-8 text-slate-400">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No previous analyses found.</p>
                        </div>
                    ) : (
                        history.map((item) => (
                            <button
                                key={item._id}
                                onClick={() => onSelectAnalysis(item._id)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-md group relative overflow-hidden ${currentAnalysisId === item._id
                                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                                    : 'bg-white border-slate-200 hover:border-indigo-200'
                                    }`}
                            >
                                {currentAnalysisId === item._id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                )}

                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-slate-800 font-outfit">
                                            {item.target_role}
                                        </span>
                                        {currentAnalysisId === item._id && (
                                            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${getScoreColor(item.match_score)}`}>
                                        {item.match_score}% Match
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <div className="flex items-center space-x-4">
                                        <span className="flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {formatDate(item.created_at)}
                                        </span>
                                    </div>
                                    <ChevronRight className={`h-4 w-4 transition-transform ${currentAnalysisId === item._id ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1'
                                        }`} />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AnalysisHistoryModal;
