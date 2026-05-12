import React, { useState } from 'react';
import {
  Play, BookOpen, Trophy, Award
} from 'lucide-react';
import type { Simulation } from '../types/simulation';
import SimulationResultsModal from './SimulationResultsModal';
import SimulationModeModal from './SimulationModeModal';
import SimulationNotesModal from './SimulationNotesModal';
import CertificateModal from './CertificateModal';
const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface SimulationCardProps {
  simulation: Simulation;
  onStartMode: (simulationId: string, modeId: string, isReset?: boolean) => void;
}

const SimulationCard: React.FC<SimulationCardProps> = ({
  simulation,
  onStartMode
}) => {
  const [showModeModal, setShowModeModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [isLoadingCert, setIsLoadingCert] = useState(false);

  const handleViewCertificate = async () => {
    setIsLoadingCert(true);
    try {
      // Fetch or generate certificate
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userId) headers['x-user-id'] = userId;

      const response = await fetch(`${API_BASE}/api/simulation/certificate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ simulationId: simulation.id, userId })
      });
      const data = await response.json();
      if (data.success && data.certificate) {
        setCertificateData(data.certificate);
        setShowCertificateModal(true);
      }
    } catch (error) {
      console.error('Failed to load certificate:', error);
    } finally {
      setIsLoadingCert(false);
    }
  };

  // Difficulty badge colors modified for dark mode
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Intermediate': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Advanced': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  // Unlock logic: update modes' unlocked property based on completion
  const processedModes = (simulation.modes || []).map((mode, _, arr) => {
    if (mode.id === 'guided') {
      return { ...mode, unlocked: true };
    }
    if (mode.id === 'challenge') {
      const guided = arr.find(m => m.id === 'guided');
      return { ...mode, unlocked: guided?.completed || false };
    }
    if (mode.id === 'project') {
      const challenge = arr.find(m => m.id === 'challenge');
      return { ...mode, unlocked: challenge?.completed || false };
    }
    // Peer Compare: only unlocked if all previous are completed
    if (mode.id === 'peer') {
      const allPrev = arr.filter(m => m.id !== 'peer').every(m => m.completed);
      return { ...mode, unlocked: allPrev };
    }
    return mode;
  });

  return (
    <>
      <div className="bg-white/70 backdrop-blur-xl h-full rounded-3xl border border-white/60 hover:border-indigo-400 shadow-lg shadow-indigo-100/40 hover:shadow-xl hover:shadow-indigo-200/40 transition-all duration-300 relative overflow-hidden flex flex-col group">
        {/* Top Gradient Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

        <div className="p-6 flex-1 flex flex-col">
          {/* Header: Difficulty & Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getDifficultyColor(simulation.difficulty)}`}>
                {simulation.difficulty}
              </span>
              {/* Resume Context Badge */}
              {(simulation as any).createdFrom === 'resume' && (simulation as any).targetRole && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  From Resume
                </span>
              )}
            </div>
            {simulation.overallProgress > 0 && (
              <div className="flex items-center gap-1.5 text-indigo-600">
                <Trophy className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{simulation.overallProgress}%</span>
              </div>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="text-xl font-bold font-outfit text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
            {simulation.title}
          </h3>
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">
            {simulation.description}
          </p>

          {/* Skills Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {simulation.skills && simulation.skills.slice(0, 3).map((skill, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-100 font-medium">
                {skill}
              </span>
            ))}
            {simulation.skills && simulation.skills.length > 3 && (
              <span className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-100 font-medium">
                +{simulation.skills.length - 3}
              </span>
            )}
          </div>

          <div className="flex-1" /> {/* Spacer */}

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500 font-medium">Progress</span>
              <span className="text-slate-700 font-bold">{simulation.completedModes?.length || 0} / {simulation.modes?.length || 4} Modes</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full relative"
                style={{ width: `${simulation.overallProgress || 0}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {simulation.overallProgress >= 100 ? (
              <button
                onClick={handleViewCertificate}
                disabled={isLoadingCert}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4 fill-current" />
                {isLoadingCert ? 'Loading...' : 'View Certificate'}
              </button>
            ) : (
              <button
                onClick={() => setShowModeModal(true)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Start
              </button>
            )}
            <button
              onClick={() => setShowNotesModal(true)}
              className="px-4 py-2.5 bg-white text-slate-400 font-medium rounded-xl text-sm border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SimulationNotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        simulationId={simulation.id}
        simulationTitle={simulation.title}
      />

      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        certificate={certificateData}
      />

      <SimulationModeModal
        isOpen={showModeModal}
        onClose={() => setShowModeModal(false)}
        simulationId={(simulation.id || simulation._id) as string}
        simulationTitle={simulation.title}
        modes={processedModes}
        onStartMode={(simId, modeId, isReset) => onStartMode(simId, modeId, isReset)}
      />

      <SimulationResultsModal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        simulationId={simulation.id}
        simulationTitle={simulation.title}
        results={[
          // Mock results logic handled in component or passed down if needed in future
        ]}
      />
    </>
  );
};

export { SimulationCard };
