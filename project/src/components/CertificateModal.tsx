import React, { useRef } from 'react';
import { X, Download, Award } from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import jsPDF from 'jspdf';

interface CertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    certificate: any;
}

const CertificateModal: React.FC<CertificateModalProps> = ({ isOpen, onClose, certificate }) => {
    const certificateRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !certificate) return null;

    const handleDownload = async () => {
        if (certificateRef.current) {
            const canvas = await html2canvas(certificateRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`RunaGen_Certificate_${certificate.certificateCode}.pdf`);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        Official Certificate
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownload}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 bg-slate-200 flex justify-center">
                    <div
                        ref={certificateRef}
                        className="w-[800px] h-[560px] bg-white relative shadow-xl overflow-hidden text-slate-900 flex-shrink-0"
                        style={{ fontFamily: "'Cinzel', serif" }} // Ideally import a nice serif font
                    >
                        {/* Decorative Border */}
                        <div className="absolute inset-4 border-4 border-double border-indigo-900/20" />
                        <div className="absolute inset-6 border border-indigo-900/10" />

                        {/* Corner Accents */}
                        <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-indigo-600" />
                        <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-indigo-600" />
                        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-indigo-600" />
                        <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-indigo-600" />

                        {/* Content */}
                        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-12">
                            {/* Logo Watermark */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                                <img src="/runagen-logo.svg" className="w-96 h-96 object-contain grayscale" />
                            </div>

                            <div className="mb-8">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <img src="/runagen-logo.svg" className="w-8 h-8 object-contain" />
                                    <span className="text-2xl font-black tracking-widest text-indigo-900 uppercase">RUNA GEN</span>
                                </div>
                                <div className="h-1 w-32 bg-indigo-600 mx-auto" />
                            </div>

                            <h1 className="text-5xl font-serif text-slate-900 mb-6 tracking-wide">Certificate of Completion</h1>
                            <p className="text-lg text-slate-500 uppercase tracking-widest mb-2">This is to certify that</p>

                            <div className="text-4xl font-bold text-indigo-700 mb-6 border-b-2 border-slate-200 pb-2 px-12 min-w-[400px]">
                                {certificate.userName || "Student Name"}
                            </div>

                            <p className="text-lg text-slate-600 mb-8 max-w-2xl leading-relaxed">
                                has successfully completed the <strong className="text-slate-900">{certificate.simulationTitle}</strong> career simulation, demonstrating proficiency in practical application and technical skills.
                            </p>

                            <div className="grid grid-cols-2 gap-12 w-full max-w-2xl mb-12">
                                <div className="text-left">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Skills Validated</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(certificate.skillsValidated || []).slice(0, 4).map((skill: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-800 text-xs font-bold rounded-md border border-indigo-100">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Issue Date</h4>
                                    <p className="font-bold text-slate-800">{new Date(certificate.issueDate).toLocaleDateString()}</p>

                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1">Certificate ID</h4>
                                    <p className="font-mono text-xs text-slate-500">{certificate.certificateCode}</p>
                                </div>
                            </div>

                            <div className="flex items-end justify-between w-full max-w-2xl mt-auto">
                                <div className="text-center">
                                    <img src="/signature-placeholder.png" className="h-12 w-32 object-contain opacity-50 mb-2 mx-auto" onError={(e) => e.currentTarget.style.display = 'none'} />
                                    <div className="w-40 h-px bg-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase">AI Director</p>
                                </div>

                                <div className="w-24 h-24 relative">
                                    {/* Seal */}
                                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full flex items-center justify-center p-1">
                                        <div className="w-full h-full border border-indigo-600 rounded-full flex items-center justify-center bg-indigo-50">
                                            <div className="text-center">
                                                <Award className="w-8 h-8 text-indigo-600 mx-auto mb-1" />
                                                <div className="text-[8px] font-black text-indigo-900 uppercase leading-none">Verified<br />Excellence</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateModal;
