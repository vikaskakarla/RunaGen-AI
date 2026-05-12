import React from 'react';
import { Copy, Download, RefreshCw, Check } from 'lucide-react';
// @ts-ignore
import jsPDF from 'jspdf';

interface CoverLetterGeneratorProps {
    coverLetterData: any;
    onRegenerate: () => void;
    isLoading: boolean;
}

const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({ coverLetterData, onRegenerate, isLoading }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        if (coverLetterData?.cover_letter) {
            navigator.clipboard.writeText(coverLetterData.cover_letter);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (coverLetterData?.cover_letter) {
            const doc = new jsPDF();

            // Add text with word wrap
            // Basic implementation, for production use custom fonts/styling
            doc.setFontSize(12);
            const splitText = doc.splitTextToSize(coverLetterData.cover_letter, 180);
            doc.text(splitText, 15, 20);

            doc.save('Cover_Letter.pdf');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Drafting your cover letter...</h3>
                <p className="text-slate-400 text-sm">Our AI is analyzing the job description and your unique skills.</p>
            </div>
        );
    }

    if (!coverLetterData) return null;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-8 shadow-lg shadow-indigo-100/20 border border-slate-100">
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Generated Cover Letter</h2>
                        <p className="text-sm text-slate-500">Tailored specificially for this role.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors relative group"
                            title="Copy to Clipboard"
                        >
                            {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                            title="Download PDF"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onRegenerate}
                            className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Regenerate
                        </button>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap font-serif text-slate-700 leading-relaxed text-lg">
                        {coverLetterData.cover_letter}
                    </div>
                </div>

                {coverLetterData.key_highlights && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">AI Inclusions</h4>
                        <div className="flex flex-wrap gap-2">
                            {coverLetterData.key_highlights.map((highlight: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                                    {highlight}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoverLetterGenerator;
