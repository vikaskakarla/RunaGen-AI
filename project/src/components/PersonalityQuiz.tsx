import { useState } from 'react';
import { Brain, RefreshCw } from 'lucide-react';

interface PersonalityQuizProps {
    userData: any;
    onUpdate: () => void;
    skillsProfile?: any;  // Optional skills profile from resume analysis
}

const PersonalityQuiz: React.FC<PersonalityQuizProps> = ({ userData, onUpdate, skillsProfile }) => {
    const [showQuiz, setShowQuiz] = useState(false);
    const [isQuizLoading, setIsQuizLoading] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
    const [quizResult, setQuizResult] = useState<any>(null);

    // Log skills profile if available (for future personalized quiz questions)
    if (skillsProfile) {
        console.log('📋 PersonalityQuiz: Skills profile available for personalization', {
            company: skillsProfile.targetCompany,
            role: skillsProfile.targetRole,
            skillsCount: skillsProfile.skills?.length || 0
        });
    }

    const handleStartQuiz = async () => {
        setIsQuizLoading(true);
        setQuizResult(null);
        try {
            const token = localStorage.getItem('token');
            const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

            const res = await fetch(`${API_BASE}/api/quiz/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const session = await res.json();
                setQuizQuestions(session.questions);
                setCurrentQuestion(session.currentQuestionIndex || 0);
                if (session.answers) {
                    setQuizAnswers(session.answers);
                }
                setShowQuiz(true);
            } else {
                alert("Failed to generate assessment. Please try again.");
            }
        } catch (error) {
            console.error("Quiz start error:", error);
            alert("Network error starting assessment.");
        } finally {
            setIsQuizLoading(false);
        }
    };

    const handleQuizAnswer = async (type: string) => {
        const newAnswers = { ...quizAnswers, [currentQuestion]: type };
        setQuizAnswers(newAnswers);

        const token = localStorage.getItem('token');
        const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

        fetch(`${API_BASE}/api/quiz/answer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ questionIndex: currentQuestion, answer: type })
        }).catch(err => console.error("Save answer failed", err));

        if (currentQuestion < quizQuestions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        } else {
            await handleQuizComplete();
        }
    };

    const handleQuizComplete = async () => {
        setIsQuizLoading(true);
        try {
            const token = localStorage.getItem('token');
            const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

            const res = await fetch(`${API_BASE}/api/quiz/complete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setQuizResult(data);
                setShowQuiz(false);
                onUpdate();
            } else {
                alert("Failed to analyze results.");
            }
        } catch (error) {
            console.error("Quiz complete error:", error);
            alert("Network error completing assessment.");
        } finally {
            setIsQuizLoading(false);
        }
    };

    if (quizResult) {
        return (
            <div className="bg-white rounded-xl p-6 border border-purple-200 shadow-sm relative max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                    <div className="inline-flex p-4 bg-purple-100 rounded-full mb-4">
                        <Brain className="h-10 w-10 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Assessment Complete!</h3>
                    <p className="text-gray-600">You scored <span className="font-bold text-purple-600">{quizResult.score}%</span></p>
                </div>

                <div className="space-y-6">
                    {quizResult.results.map((result: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-xl border ${result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                            <p className="font-medium text-gray-900 mb-2">{idx + 1}. {result.text}</p>
                            <div className="text-sm space-y-1">
                                <p className={result.isCorrect ? 'text-green-700' : 'text-red-600'}>
                                    Your Answer: {result.userAnswer}
                                </p>
                                {!result.isCorrect && (
                                    <p className="text-green-700 font-medium">Correct Answer: {result.correctAnswer}</p>
                                )}
                                <p className="text-gray-600 mt-2 text-xs italic">
                                    <span className="font-semibold">Reasoning:</span> {result.reasoning}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => setQuizResult(null)}
                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
                >
                    Close & Return to Profile
                </button>
            </div>
        );
    }

    if (showQuiz) {
        return (
            <div className="bg-white rounded-xl p-6 border border-purple-200 shadow-sm relative max-w-2xl mx-auto">
                {isQuizLoading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-semibold text-gray-800">Question {currentQuestion + 1} of {quizQuestions.length}</h4>
                    <span className="text-sm text-purple-600 font-medium">{Math.round(((currentQuestion) / quizQuestions.length) * 100)}% Complete</span>
                </div>

                {quizQuestions[currentQuestion] && (
                    <div className="mb-8">
                        <h5 className="text-xl font-medium text-gray-900 mb-6">{quizQuestions[currentQuestion].text}</h5>
                        <div className="space-y-3">
                            {quizQuestions[currentQuestion].options.map((option: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuizAnswer(option.value)}
                                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 flex items-center group"
                                >
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-purple-500 mr-3 flex-shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-gray-700 group-hover:text-gray-900 font-medium">{option.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestion) / quizQuestions.length) * 100}%` }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-6">
                    <Brain className="h-6 w-6 mr-2 text-purple-600" />
                    Skill Assessment
                </h2>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 text-center border border-purple-100">
                    <div className="inline-flex p-4 bg-white rounded-full shadow-md mb-4 text-purple-600">
                        <Brain className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {userData.lastQuizScore !== undefined
                            ? `Last Score: ${userData.lastQuizScore}%`
                            : "Assess Your Skills"}
                    </h3>
                    <p className="text-gray-600 max-w-lg mx-auto mb-6">
                        Take our AI-driven skill assessment to validate your knowledge and earn badges.
                    </p>

                    <button
                        onClick={handleStartQuiz}
                        disabled={isQuizLoading}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 transform hover:-translate-y-1"
                    >
                        {isQuizLoading ? (
                            <span className="flex items-center justify-center"><RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Preparing Assessment...</span>
                        ) : (
                            userData.lastQuizScore !== undefined ? "Retake Assessment" : "Start Assessment"
                        )}
                    </button>

                    {userData.personalityDate && (
                        <p className="text-xs text-gray-400 mt-4">Last updated: {new Date(userData.personalityDate).toLocaleDateString()}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PersonalityQuiz;
