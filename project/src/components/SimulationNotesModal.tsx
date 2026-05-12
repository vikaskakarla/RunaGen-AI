import React, { useState, useEffect } from 'react';
import {
    X, BookOpen, Download, Copy, Check,
    FileText, Printer
} from 'lucide-react';

interface SimulationNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    simulationId: string;
    simulationTitle: string;
    userId?: string;
}

const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const SimulationNotesModal: React.FC<SimulationNotesModalProps> = ({
    isOpen,
    onClose,
    simulationId,
    simulationTitle,
    userId
}) => {
    const [notes, setNotes] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen && !notes) {
            fetchNotes();
        }
    }, [isOpen, simulationId]);

    const fetchNotes = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/simulation/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ simulationId, userId }),
            });

            const data = await response.json();
            if (data.success) {
                setNotes(data.notes);
            } else {
                throw new Error(data.error || 'Failed to fetch notes');
            }
        } catch (err: any) {
            console.error('Error fetching notes:', err);
            setError(err.message || 'The AI is a bit busy. Please try again in a moment.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(notes);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([notes], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = `${simulationTitle.replace(/\s+/g, '_')}_Study_Notes.md`;
        document.body.appendChild(element);
        element.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
                            <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-xl font-bold text-slate-800">Study Notes</h2>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">AI Generated</span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium">{simulationTitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {!isLoading && notes && (
                            <>
                                <button
                                    onClick={handleCopy}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-500 hover:text-indigo-600 relative group"
                                    title="Copy to clipboard"
                                >
                                    {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {copied ? 'Copied!' : 'Copy'}
                                    </span>
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-500 hover:text-indigo-600 relative group"
                                    title="Download as Markdown"
                                >
                                    <Download className="h-5 w-5" />
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        Download
                                    </span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-600 ml-2"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/30 p-8">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-indigo-500 animate-spin" />
                                <BookOpen className="h-6 w-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-slate-800">Compiling Expert Notes...</p>
                                <p className="text-sm text-slate-500">Our AI mentor is summarizing the key concepts for you.</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                            <div className="p-4 bg-red-50 rounded-2xl mb-4">
                                <X className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Oops! Something went wrong</h3>
                            <p className="text-slate-600 max-w-sm mb-6">{error}</p>
                            <button
                                onClick={fetchNotes}
                                className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 prose prose-slate prose-indigo">
                            {/* Note: In a production app, we'd use react-markdown here. 
                  For now, we'll implement a simple markdown-to-html renderer for better aesthetics */}
                            <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                                <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                                    {notes.split('\n').map((line, i) => {
                                        const h1Match = line.match(/^\s*#\s+(.*)/);
                                        if (h1Match) return <h1 key={i} className="text-3xl font-bold text-slate-900 mb-6 mt-2 border-b-2 border-slate-100 pb-2">{h1Match[1]}</h1>;

                                        const h2Match = line.match(/^\s*##\s+(.*)/);
                                        if (h2Match) return <h2 key={i} className="text-2xl font-bold text-slate-800 mb-4 mt-8 flex items-center">{h2Match[1]}</h2>;

                                        const h3Match = line.match(/^\s*###\s+(.*)/);
                                        if (h3Match) return <h3 key={i} className="text-xl font-bold text-slate-800 mb-3 mt-6">{h3Match[1]}</h3>;

                                        const listMatch = line.match(/^\s*[-\*]\s+(.*)/);
                                        if (listMatch) return <div key={i} className="flex items-start space-x-3 mb-2 ml-2">
                                            <div className="min-w-[6px] h-[6px] rounded-full bg-indigo-400 mt-[10px]" />
                                            <span>{listMatch[1]}</span>
                                        </div>;

                                        if (line.trim() === '') return <div key={i} className="h-4" />;
                                        return <p key={i} className="mb-4">{line}</p>;
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!isLoading && notes && (
                    <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center text-xs text-slate-400 font-medium italic">
                            <FileText className="h-3 w-3 mr-1" />
                            Notes generated on {new Date().toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center space-x-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-700 transition-all font-bold"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Print Notes</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimulationNotesModal;
