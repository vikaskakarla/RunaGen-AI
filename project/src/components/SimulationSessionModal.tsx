import React, { useState, useEffect, useRef } from 'react';
import {
    X, Send, Bot, Star, ChevronRight,
    Terminal, Lightbulb, Target,
    Loader2, Trophy, Clock, BookOpen,
    CheckCircle, AlertCircle, ArrowRight
} from 'lucide-react';

const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    suggestions?: string[];
}

interface SimulationSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    simulationId: string;
    modeId: string;
    simulationTitle: string;
    userId?: string;
    isReset?: boolean;
}

const SimulationSessionModal: React.FC<SimulationSessionModalProps> = ({
    isOpen,
    onClose,
    simulationId,
    modeId,
    simulationTitle,
    userId,
    isReset
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [points, setPoints] = useState(0);
    const [mission, setMission] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [notes, setNotes] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [totalSteps, setTotalSteps] = useState<number>(5);
    const [stepTitle, setStepTitle] = useState<string | null>(null);
    const [lastFeedback, setLastFeedback] = useState<Message | null>(null);
    const [attempts, setAttempts] = useState<number>(1);
    const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const getPersonaInfo = (mode: string) => {
        switch (mode) {
            case 'guided': return { name: 'AI Tutor', icon: Lightbulb, color: 'from-blue-500 to-teal-500' };
            case 'challenge': return { name: 'AI Examiner', icon: Target, color: 'from-orange-500 to-red-500' };
            case 'project': return { name: 'AI Technical Lead', icon: Terminal, color: 'from-purple-500 to-indigo-500' };
            case 'peer': return { name: 'AI Colleague', icon: Bot, color: 'from-teal-500 to-blue-500' };
            default: return { name: 'AI Mentor', icon: Bot, color: 'from-teal-500 to-blue-500' };
        }
    };

    const persona = getPersonaInfo(modeId);

    useEffect(() => {
        if (isOpen && simulationId && userId && (messages.length === 0 || isReset)) {
            fetchSession();
            if (modeId === 'guided') {
                fetchNotes();
            }
        }
    }, [isOpen, simulationId, modeId, userId, isReset]);

    const fetchNotes = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (userId) headers['x-user-id'] = userId;

            const response = await fetch(`${API_BASE}/api/simulation/notes`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ simulationId, userId }),
            });
            const data = await response.json();
            if (data.success) {
                setNotes(data.notes);
            }
        } catch (error) {
            console.error('Failed to fetch notes for session:', error);
        }
    };

    useEffect(() => {
        if (modeId !== 'guided') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, modeId]);

    const fetchSession = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (userId) headers['x-user-id'] = userId;

            // NEW: If isReset is true, bypass fetching and start fresh
            if (isReset) {
                console.log(`🔄 Force resetting session in ${modeId} mode`);
                await startSession(true);
                return;
            }

            // Try to get existing session
            const response = await fetch(`${API_BASE}/api/simulation/session/${simulationId}/${modeId}`, { headers });
            const data = await response.json();

            if (data.success && data.session) {
                // Restore session
                const session = data.session;
                setMessages(session.messages || []);
                setCurrentStep(session.currentStep);
                setTotalSteps(session.totalSteps);
                setMission(session.mission);
                setPoints(session.points);
                setAttempts(session.attempts || 1);
                // Last message suggestions if available
                const lastMsg = session.messages[session.messages.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    setSuggestions(lastMsg.suggestions || []);
                    if (modeId === 'guided') {
                        setLastFeedback(lastMsg);
                    }
                }
            } else {
                // No session? Start new one
                startSession();
            }
        } catch (error) {
            console.error('Failed to fetch session:', error);
            startSession(); // Fallback
        } finally {
            setIsLoading(false);
        }
    };

    const startSession = async (forceReset = false) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (userId) headers['x-user-id'] = userId;

            const response = await fetch(`${API_BASE}/api/simulation/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    simulationId,
                    modeId,
                    message: "START_SESSION",
                    userId,
                    reset: forceReset || isReset
                }),
            });

            const data = await response.json();
            if (data.success) {
                const welcomeMsg: Message = {
                    id: 'welcome',
                    role: 'assistant',
                    content: data.reply_text,
                    timestamp: Date.now(),
                    suggestions: data.suggestions
                };
                setMessages([welcomeMsg]);
                setSuggestions(data.suggestions || []);
                if (data.points_earned) setPoints(prev => prev + data.points_earned);
                if (forceReset || isReset) setPoints(0); // Explicitly reset points on new/reset session
                if (data.mission_update) setMission(data.mission_update);
                if (data.current_step) setCurrentStep(data.current_step);
                if (data.total_steps) setTotalSteps(data.total_steps);
                if (data.step_title) setStepTitle(data.step_title);
                if (data.attempts) setAttempts(data.attempts);

                if (modeId === 'guided') {
                    setLastFeedback(welcomeMsg);
                }
            }
        } catch (error) {
            console.error('Failed to start session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (text?: string) => {
        const messageContent = text || input;
        if (!messageContent.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageContent,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        // For guided mode, we keep the input until successfully submitted or explicitly cleared? 
        // actually for guided mode wizard, we probably want to clear it only if success.
        // But for consistency let's clear it and rely on feedback.
        if (modeId !== 'guided') {
            setInput('');
        }

        setSuggestions([]);
        setIsLoading(true);
        setLastFeedback(null); // Clear previous feedback

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const token = localStorage.getItem('token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (userId) headers['x-user-id'] = userId;

            const response = await fetch(`${API_BASE}/api/simulation/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    simulationId,
                    modeId,
                    message: messageContent,
                    history,
                    userId
                }),
            });

            const data = await response.json();
            if (data.success) {
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.reply_text,
                    timestamp: Date.now(),
                    suggestions: data.suggestions
                };
                setMessages(prev => [...prev, aiMsg]);
                setSuggestions(data.suggestions || []);
                if (data.points_earned) setPoints(prev => prev + data.points_earned);
                if (data.mission_update) setMission(data.mission_update);

                // Check if step changed to determine if "Next Step" was simulated
                if (data.current_step && data.current_step !== currentStep) {
                    // Step progressed
                    setCurrentStep(data.current_step);
                    if (modeId === 'guided') {
                        setInput(''); // Clear input on step success
                    }
                }
                if (modeId === 'guided') {
                    // Start thinking about "Try Again" logic? 
                    // Use suggestions to detect if complete?
                    // For now, text analysis is complex, but let's assume if points earned > 0 it's good progress.
                    if (data.points_earned > 0) {
                        setInput('');
                    }
                }

                if (data.total_steps) setTotalSteps(data.total_steps);
                if (data.step_title) setStepTitle(data.step_title);

                if (modeId === 'guided') {
                    setLastFeedback(aiMsg);
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const updateSimulationProgress = async (isCompleted: boolean = false) => {
        if (!simulationId) return;

        const token = localStorage.getItem('token');

        try {
            // Fetch current simulation to get existing completed modes
            const response = await fetch(`${API_BASE}/user/${userId}/simulations`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'x-user-id': userId || ''
                }
            });
            const data = await response.json();

            if (data.success) {
                const currentSim = data.simulations.find((s: any) => s.id === simulationId || s.simulation_id === simulationId);
                if (currentSim) {
                    const currentProgress = currentSim.progress || {};
                    let completedModes = currentProgress.completed_modes || [];

                    if (isCompleted && !completedModes.includes(modeId)) {
                        completedModes.push(modeId);
                    }

                    // Calculate overall progress based on completed modes (4 modes total)
                    const overallProgress = Math.min(100, Math.floor((completedModes.length / 4) * 100));

                    await fetch(`${API_BASE}/simulation/${simulationId}/progress`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : '',
                        },
                        body: JSON.stringify({
                            completed_modes: completedModes,
                            overall_progress: overallProgress
                        }),
                    });
                }
            }
        } catch (error) {
            console.error('Failed to update simulation progress:', error);
        }
    };

    // Effect to update progress when points or mission changes
    useEffect(() => {
        if (points > 0) {
            updateSimulationProgress();
        }
    }, [points]);

    // Timer Effect
    useEffect(() => {
        if (!isOpen || isLoading) return; // Wait for loading to finish
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [isOpen, isLoading]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleClose = () => {
        if (window.confirm("Are you sure you want to end the session? Progress for this attempt may be lost.")) {
            onClose();
        }
    };

    if (!isOpen) return null;

    // --- GUIDED MODE WIZARD RENDER ---
    if (modeId === 'guided') {

        return (
            <div className="fixed inset-0 z-[100] bg-white">
                <div className="relative w-full h-full flex flex-col overflow-hidden">
                    {/* Wizard Header */}
                    <div className="px-8 py-5 border-b border-slate-100 bg-white flex items-center justify-between z-10 shadow-sm">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{simulationTitle}</h2>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">Guided Mode</span>
                                <span className="text-xs text-slate-500">Step-by-step Learning</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Attempt #{attempts}</span>
                            </div>
                        </div>

                        <div className="flex-1 flex justify-center">
                            <div className="px-4 py-1.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center space-x-3">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</span>
                                <div className="h-4 w-px bg-slate-300"></div>
                                <span className="text-sm font-bold text-slate-700">Step {currentStep} <span className="text-slate-400 font-normal">of</span> {totalSteps}</span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                                <Clock className="h-4 w-4 text-slate-500 mr-2" />
                                <span className={`text-sm font-bold font-mono ${timeLeft < 300 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                            <div className="flex items-center px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                                <Trophy className="h-4 w-4 text-amber-500 mr-2" />
                                <span className="text-sm font-bold text-slate-700">{points} XP</span>
                            </div>
                            <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Wizard Body - Split View */}
                    <div className="flex-1 flex overflow-hidden bg-slate-50">
                        {/* Left Panel: Context & Notes */}
                        <div className="w-1/3 min-w-[350px] border-r border-slate-200 bg-white overflow-y-auto flex flex-col custom-scrollbar">

                            {/* Step Indicator */}
                            <div className="p-6 pb-2">
                                <div className="flex items-start space-x-4 mb-6">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-200">
                                        {currentStep}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">Current Step</h3>
                                        <h4 className="text-xl font-bold text-slate-900 leading-tight">{stepTitle || `Step ${currentStep}`}</h4>
                                    </div>
                                </div>

                                {/* Current Task / Instruction (Moved from Right Panel) */}
                                <div className="mb-6 animate-in slide-in-from-left-2 duration-500">
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50 flex items-center space-x-2">
                                            <Bot className="h-4 w-4 text-blue-600" />
                                            <h5 className="text-xs font-bold text-blue-800 uppercase tracking-widest">Instructor's Task</h5>
                                        </div>
                                        <div className="p-4">
                                            {lastFeedback ? (
                                                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {lastFeedback.content}
                                                    {/* Feedback Status Badge if re-attempting */}
                                                    {(lastFeedback.content && (lastFeedback.content.includes("Correct") || lastFeedback.content.includes("Try again"))) && (
                                                        <div className={`mt-3 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${lastFeedback.content.includes("Correct") ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                                            {lastFeedback.content.includes("Correct") ? (
                                                                <><CheckCircle className="h-3 w-3 mr-1.5" /> Correct - Proceeding</>
                                                            ) : (
                                                                <><AlertCircle className="h-3 w-3 mr-1.5" /> Try Again</>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : isLoading ? (
                                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                                                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">Generating Full Lesson Plan...</p>
                                                        <p className="text-xs text-slate-500 mt-1">Creating all 5 steps (this may take a minute)...</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-slate-400 text-sm italic">
                                                    Initializing simulation parameters...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {mission && (
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Star className="h-4 w-4 text-amber-600" />
                                            <h5 className="text-xs font-bold text-amber-800 uppercase tracking-widest">Mission Objective</h5>
                                        </div>
                                        <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
                                            {mission}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Notes Section */}
                            {notes && (
                                <div className="flex-1 px-6 pb-6">
                                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pt-2 pb-2 z-10">
                                        <div className="flex items-center space-x-2">
                                            <BookOpen className="h-4 w-4 text-slate-400" />
                                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Expert Guide</h3>
                                        </div>
                                    </div>

                                    <div className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-100">
                                        {notes.split('\n').map((line, i) => {
                                            const h1Match = line.match(/^\s*#\s+(.*)/);
                                            if (h1Match) return <h4 key={i} className="text-base font-bold text-slate-800 mb-2 mt-4 first:mt-0">{h1Match[1]}</h4>;
                                            const h2Match = line.match(/^\s*##\s+(.*)/);
                                            if (h2Match) return <h5 key={i} className="text-sm font-bold text-slate-800 mb-2 mt-3">{h2Match[1]}</h5>;

                                            const listMatch = line.match(/^\s*[-\*]\s+(.*)/);
                                            if (listMatch) return <div key={i} className="flex items-start space-x-2 mb-2 ml-1">
                                                <div className="min-w-[5px] h-[5px] rounded-full bg-blue-400 mt-[7px]" />
                                                <span className="text-sm">{listMatch[1]}</span>
                                            </div>;

                                            if (line.trim() === '') return <div key={i} className="h-2" />;
                                            return <p key={i} className="text-sm mb-2">{line}</p>;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Panel: Workspace */}
                        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                                {/* Workspace Placeholder */}
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40 select-none">
                                    {isLoading && !lastFeedback ? (
                                        <>
                                            <div className="w-20 h-20 bg-blue-50/50 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                                                <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                                            </div>
                                            <h3 className="text-xl font-bold text-blue-400 mb-2">Preparing Workspace</h3>
                                            <p className="text-sm text-slate-400 max-w-xs">
                                                Please wait while we set up your environment...
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                                                <Terminal className="h-10 w-10 text-slate-300" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-300 mb-2">Workspace</h3>
                                            <p className="text-sm text-slate-300 max-w-xs">
                                                Type your solution or answer below to complete the task on the left.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Suggestions Area (Keep in Workspace) */}
                                {suggestions.length > 0 && (
                                    <div className="mt-auto mb-4 px-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Suggested Acts</p>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestions.map((suggestion, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSendMessage(suggestion)}
                                                    className="px-4 py-2 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-sm font-medium transition-all border border-slate-200 hover:border-blue-200 shadow-sm flex items-center group"
                                                >
                                                    {suggestion}
                                                    <ArrowRight className="h-3 w-3 ml-2 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
                                <div className="max-w-4xl mx-auto">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                        Your Solution
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            placeholder="Type your answer, analysis, or code here..."
                                            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium placeholder:text-slate-400 resize-none"
                                            disabled={isLoading}
                                        />
                                        <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                                            <button
                                                onClick={() => handleSendMessage()}
                                                disabled={!input.trim() || isLoading}
                                                className={`px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition-all transform active:scale-95 flex items-center space-x-2 ${isLoading
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/25'
                                                    }`}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span>Processing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Submit</span>
                                                        <Send className="h-4 w-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                                        <div className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            <span>Take your time</span>
                                        </div>
                                        <span>Shift + Enter for new line</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- STANDARD CHAT RENDER (FOR OTHER MODES) ---
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${persona.color} shadow-lg ring-4 ring-white`}>
                            <persona.icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-xl font-bold text-slate-800">{persona.name}</h2>
                                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wider">Session Active</span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium leading-tight">{simulationTitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                            <Trophy className="h-4 w-4 text-amber-500 mr-2" />
                            <span className="text-sm font-bold text-slate-700">{points} XP</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Mission Banner */}
                {mission && (
                    <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center space-x-3">
                        <div className="p-1.5 bg-amber-200 rounded-lg">
                            <Star className="h-4 w-4 text-amber-700" />
                        </div>
                        <p className="text-sm font-semibold text-amber-900 line-clamp-1">Current Mission: {mission}</p>
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex items-start max-w-[80%] space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                <div className={`mt-1 p-2 rounded-xl border shadow-sm ${msg.role === 'user'
                                    ? 'bg-white border-slate-100'
                                    : `bg-gradient-to-br ${persona.color} border-transparent`
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <Bot className="h-4 w-4 text-slate-400" />
                                    ) : (
                                        <persona.icon className="h-4 w-4 text-white" />
                                    )}
                                </div>
                                <div className={`p-4 rounded-2xl shadow-sm ${msg.role === 'user'
                                    ? 'bg-slate-800 text-white rounded-tr-none font-medium'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none leading-relaxed'
                                    }`}>
                                    <p className="text-[15px]">{msg.content}</p>
                                    <span className="block mt-2 text-[10px] opacity-50 uppercase font-bold tracking-widest">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-3">
                                <Loader2 className="h-4 w-4 text-teal-500 animate-spin" />
                                <span className="text-sm text-slate-500 font-medium">Assistant is thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && !isLoading && (
                    <div className="px-6 py-4 bg-white border-t border-slate-50">
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(suggestion)}
                                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold transition-all duration-200 border border-slate-100 hover:border-slate-200 hover:shadow-sm flex items-center group"
                                >
                                    {suggestion}
                                    <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={`Message ${persona.name}...`}
                            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all text-slate-700 font-medium placeholder:text-slate-400 shadow-inner"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:bg-slate-300 transition-all duration-200 shadow-lg"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest px-1">
                        <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Estimated Session: 15-20 mins
                        </div>
                        <p>Press Enter to send</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulationSessionModal;
