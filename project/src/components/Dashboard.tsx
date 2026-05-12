import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Settings, Target,
  Zap, Brain, Trophy, Clock,
  FileText, BarChart3,
  Play, Flame, Sparkles,
  LogOut, ChevronRight
} from 'lucide-react';
import ResumeUpload from './ResumeUpload';
import ResumeOptimizer from './ResumeOptimizer';
import CareerIntelligence from './CareerIntelligence';
import ProfileSettings from './ProfileSettings';
import AIMentorChat from './AIMentorChat';
import ResumeIntelligence from './ResumeIntelligence';
import { SimulationCard } from './SimulationCard';
import SimulationSessionModal from './SimulationSessionModal';
import SkillLearningModal from './SkillLearningModal';
import SkillsGapAnalysis from './SkillsGapAnalysis';
import PersonalityQuiz from './PersonalityQuiz';
import BadgeShowcase from './BadgeShowcase';
import DashboardSkeleton from './DashboardSkeleton';
import SimulationGridSkeleton from './SimulationGridSkeleton';
import RoadmapDisplay from './RoadmapDisplay';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import ThreeBadge from './ThreeBadge';
import AnalysisHistoryModal from './AnalysisHistoryModal';
import CareerHistoryModal from './CareerHistoryModal';

const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';


interface ResumeAnalysis {
  analysisId?: string;
  skillsFound: string[];
  skillsGap: any[];
  jobMatches: any[];
  overallScore: number;
  recommendations: string[];
  experienceLevel: string;
  careerTracks: string[];
  role?: string;
  target_role?: string;
  skillsPresent?: string[];
  skillsMissing?: string[];

  // Persisted Career Data
  careerTrajectory?: any;
  marketReport?: any;
  salaryData?: any;
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [dynamicSimulations, setDynamicSimulations] = useState<any[]>([]);
  const [isLoadingSimulations, setIsLoadingSimulations] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [activeSessionInfo, setActiveSessionInfo] = useState<{ id: string, modeId: string, title: string, isReset?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newBadge, setNewBadge] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCareerHistoryModal, setShowCareerHistoryModal] = useState(false);
  const [skillsProfile, setSkillsProfile] = useState<any>(null);  // Skills profile from resume analysis
  const [latestRoadmap, setLatestRoadmap] = useState<any>(null);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Initialize with defaults - data will be fetched from MongoDB
  const [userData, setUserData] = useState(() => {
    return {
      name: "Guest User",
      email: "",
      careerTrack: "Explore",
      level: 1,
      xp: 0,
      xpToNext: 1000,
      profileComplete: 0,
      skillsGapScore: 0,
      personalityType: "Explorer",
      experienceLevel: "Entry-Level",
      streak: { current: 0, max: 0 },
      dailyStats: [],
      badges: [],
      recentActivity: [],
      personality: "Explorer",
      personalityTracks: [],
      personalityDate: null as string | null,
      lastQuizScore: null as number | null,
      university: "",
      currentCompany: "",
      bio: "",
      manualSkills: [],
      preferences: {
        industry: [],
        locations: [],
        salary: { min: 0, max: 0, currency: 'USD' },
        remote: true,
        relocation: false
      },
      weeklyStats: { simulations: 0, mentorChats: 0, xpEarned: 0 },
      profileImage: undefined as string | undefined,
      settings: {
        isStudent: true,
        isPublic: false,
        notifications: { product: true, reminders: true, mentor: true }
      }
    };
  });

  // Real-time updates with Socket.io
  // useMemo for socket to keep a stable reference
  const socket = useMemo(() => io(API_BASE, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
    autoConnect: false
  }), []);

  const handleGenerateSimulation = async () => {
    if (!resumeAnalysis || !userId) return;

    setIsLoadingSimulations(true);
    try {
      const response = await fetch(`${API_BASE}/start-career-simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          userId,
          analysisId: lastAnalysisId,
          role: resumeAnalysis.role,
          skillsPresent: resumeAnalysis.skillsFound,
          skillsMissing: resumeAnalysis.skillsGap?.map((sg: any) => sg.skill) || [],
          jobMatches: resumeAnalysis.jobMatches
        })
      });

      const data = await response.json();
      if (data.success && data.simulation) {
        const simulationId = data.simulation_id;
        const newSim = {
          id: simulationId,
          _id: simulationId,
          ...data.simulation
        };
        setDynamicSimulations(prev => {
          const exists = prev.find(s => (s.id === simulationId || s._id === simulationId));
          if (exists) return prev;
          return [newSim, ...prev];
        });
      }
    } catch (error) {
      console.error('Failed to generate simulation:', error);
    } finally {
      setIsLoadingSimulations(false);
    }
  };

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = user?.id || user?._id || localStorage.getItem('userId');

    if (!currentUserId) return;

    const headers: any = {
      'x-user-id': currentUserId
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${API_BASE}/api/user/full-profile`, { headers });
      if (response.ok) {
        const fullData = await response.json();
        if (fullData.success) {
          const { user: statsData, analysis: analysisData, roadmap: roadmapData, simulation: simulationData } = fullData;

          if (statsData) {
            setUserData(prev => ({
              ...prev,
              ...statsData,
              name: statsData.fullName || statsData.name || statsData.firstName || prev.name,
              weeklyStats: statsData.weeklyStats || prev.weeklyStats || { simulations: 0, mentorChats: 0, xpEarned: 0 }
            }));
            if (statsData.skillsProfile) setSkillsProfile(statsData.skillsProfile);
          }

          if (analysisData) {
            setResumeAnalysis({
              analysisId: analysisData._id || analysisData.id,
              skillsFound: analysisData.skills_present || [],
              skillsGap: analysisData.skills_missing?.map((skill: any) =>
                typeof skill === 'string' ? { skill, currentLevel: 0, targetLevel: 80, gap: 80, priority: 'high' } : skill
              ) || [],
              jobMatches: analysisData.job_matches || [],
              overallScore: analysisData.match_score || 0,
              recommendations: analysisData.recommendations || [],
              experienceLevel: analysisData.experience_level || 'Entry-Level',
              careerTracks: [],
              role: analysisData.target_role,
              target_role: analysisData.target_role,
              skillsPresent: analysisData.skills_present || [],
              skillsMissing: analysisData.skills_missing || [],
              careerTrajectory: analysisData.career_trajectory,
              marketReport: analysisData.market_report,
              salaryData: analysisData.salary_data
            });
            setLastAnalysisId(analysisData._id || analysisData.id);
          }

          if (roadmapData) setLatestRoadmap(roadmapData);
          if (simulationData && dynamicSimulations.length === 0) {
            const mappedSim = {
              ...simulationData,
              id: simulationData.id || simulationData._id,
              _id: simulationData._id || simulationData.id
            };
            setDynamicSimulations([mappedSim]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dynamicSimulations.length]);

  // 1. Connection Lifecycle Effect (Runs once)
  useEffect(() => {
    if (!socket.connected) socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  // 2. Data Fetching & Listeners Effect
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    let currentUserId = user?.id || user?._id || localStorage.getItem('userId');

    if (!currentUserId) {
      const tempId = localStorage.getItem('temp_user_id');
      if (tempId) {
        currentUserId = tempId;
      } else {
        currentUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('temp_user_id', currentUserId);
      }
    }
    setUserId(currentUserId);

    const onConnect = () => console.log('Socket connected:', socket.id);
    const onConnectError = (err: any) => console.warn('Socket error:', err.message);
    const onBadgeUnlocked = (badge: any) => {
      setNewBadge(badge);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      fetchData();
    };
    const onUserUpdate = () => fetchData();

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);

    fetchData();

    if (currentUserId) {
      socket.on(`user_update_${currentUserId}`, onUserUpdate);
      socket.on('badge_unlocked', onBadgeUnlocked);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      if (currentUserId) {
        socket.off(`user_update_${currentUserId}`, onUserUpdate);
        socket.off('badge_unlocked', onBadgeUnlocked);
      }
    };
  }, [refreshKey, fetchData, socket]);

  // Fetch Simulations on tab change or refresh
  useEffect(() => {
    if (activeTab === 'simulations' && (dynamicSimulations.length === 0 || refreshKey > 0)) {
      const fetchSimulations = async () => {
        setIsLoadingSimulations(true);
        try {
          const token = localStorage.getItem('token');
          const headers: HeadersInit = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          if (userId) headers['x-user-id'] = userId;

          // Use hardcoded scenarios to ensure display if API fails or is empty for demo
          const response = await fetch(`${API_BASE}/api/simulations`, { headers });
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setDynamicSimulations(data);
          } else {
            console.log('ℹ️ No personalized simulations found for user');
            setDynamicSimulations([]);
          }
        } catch (error) {
          console.error("Failed to fetch simulations", error);
        } finally {
          setIsLoadingSimulations(false);
        }
      };

      fetchSimulations();
    }
  }, [activeTab, userId, refreshKey]);

  // Handle Analysis Selection from History
  const handleSelectAnalysis = async (analysisId: string) => {
    setShowHistoryModal(false);
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE}/api/user/analysis/${analysisId}`, { headers });
      const data = await res.json();

      if (data.success && data.analysis) {
        const analysisData = data.analysis;
        setResumeAnalysis({
          analysisId: analysisData._id || analysisData.id,
          skillsFound: analysisData.skills_present || [],
          skillsGap: analysisData.skills_missing?.map((skill: any) => {
            if (typeof skill === 'string') {
              return {
                skill: skill,
                currentLevel: 0,
                targetLevel: 80,
                gap: 80,
                priority: 'high'
              };
            }
            return skill;
          }) || [],
          jobMatches: analysisData.job_matches || [],
          overallScore: analysisData.match_score || 0,
          recommendations: analysisData.recommendations || [],
          experienceLevel: analysisData.experience_level || 'Entry-Level',
          careerTracks: [],
          role: analysisData.target_role,
          target_role: analysisData.target_role,
          skillsPresent: analysisData.skills_present || [],
          skillsMissing: analysisData.skills_missing || [],

          // Persisted Fields
          careerTrajectory: analysisData.career_trajectory,
          marketReport: analysisData.market_report,
          salaryData: analysisData.salary_data
        });
        setLastAnalysisId(analysisId);
      }
    } catch (error) {
      console.error("Failed to load historical analysis", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleStartSimulation = (simulationId: string, modeId: string, title: string, isReset?: boolean) => {
    setActiveSessionInfo({ id: simulationId, modeId: modeId, title: title, isReset });
    setShowSessionModal(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Current Streak', value: `${userData.streak?.current || 0} Days`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
                { label: 'Total XP', value: userData.xp, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                { label: 'Current Level', value: `Level ${userData.level}`, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' }
              ].map((stat, i) => (
                <div key={i} className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-xl shadow-indigo-100/40 hover:scale-[1.02] transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.border} border group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    {/* Decoration */}
                    <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors" />
                  </div>
                  <h3 className="text-3xl font-bold font-outfit text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{stat.value}</h3>
                  <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity Feed */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-xl shadow-indigo-100/40">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold font-outfit text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Recent Activity
                  </h3>
                  <button className="text-sm text-slate-400 hover:text-indigo-600 transition-colors">View All</button>
                </div>

                <div className="space-y-4">
                  {userData.recentActivity && userData.recentActivity.length > 0 ? (
                    userData.recentActivity.slice(0, 5).map((activity: any, index: number) => {
                      const icons: any = {
                        simulation: Zap,
                        mentor_chat: Brain,
                        resume_upload: FileText,
                        skill_exploration: Target,
                        resume_optimization: FileText,
                        cover_letter_generation: FileText,
                        badge: Trophy
                      };
                      const Icon = icons[activity.type] || Clock;

                      return (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white/60 border border-slate-100 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group">
                          <div className="p-3 bg-slate-50 rounded-lg text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">{activity.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {activity.timestamp ? new Date(activity.timestamp).toLocaleString(undefined, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              }) : 'Just now'}
                            </p>
                          </div>
                          {activity.points && (
                            <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold">
                              +{activity.points} XP
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400">No recent activity found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Weekly Goals / Progress */}
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-xl shadow-indigo-100/40">
                <h3 className="text-xl font-bold font-outfit text-slate-800 mb-8 flex items-center gap-2">
                  <Target className="w-5 h-5 text-violet-500" />
                  Weekly Goals
                </h3>
                <div className="space-y-6">
                  {[
                    { label: 'Complete 3 Simulations', current: userData.weeklyStats?.simulations || 0, target: 3, color: 'from-indigo-500 to-violet-600' },
                    { label: 'Earn 1500 XP', current: userData.weeklyStats?.xpEarned || 0, target: 1500, color: 'from-fuchsia-500 to-pink-600' },
                    { label: 'Chat with AI Mentor', current: userData.weeklyStats?.mentorChats || 0, target: 5, color: 'from-amber-400 to-orange-500' }
                  ].map((goal, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 font-medium">{goal.label}</span>
                        <span className="text-slate-400">{goal.current}/{goal.target}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${goal.color} rounded-full`}
                          style={{ width: `${(goal.current / goal.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Zap className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="text-indigo-900 font-bold text-sm mb-1">Pro Tip</h4>
                      <p className="text-xs text-indigo-700/70 leading-relaxed">
                        Completing a system design simulation today will boost your backend skill score by 15%.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements & Heatmap Section */}
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <Trophy className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold font-outfit text-slate-800">Achievements & Consistency</h3>
              </div>
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-1 border border-white/60 shadow-xl shadow-indigo-100/40 overflow-hidden">
                <BadgeShowcase embedded={true} />
              </div>
            </div>
          </div>
        );

      case 'careers':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Career AI Header with History Button */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold font-outfit text-slate-800 mb-2">Career AI</h2>
                <p className="text-slate-500">Personalized career insights and roadmaps</p>
              </div>
              <button
                onClick={() => setShowCareerHistoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200"
                title="View career AI history"
              >
                <Clock className="w-5 h-5" />
                <span className="font-medium">History</span>
              </button>
            </div>
            {lastAnalysisId && (
              <div className="grid grid-cols-1 gap-8">
                {/* Personality Quiz / Assessment */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-1 border border-white/60 shadow-xl shadow-indigo-100/40">
                  <div className="p-8">
                    <PersonalityQuiz userData={userData} onUpdate={handleRefresh} skillsProfile={skillsProfile} />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-1 overflow-hidden border border-white/60 shadow-xl shadow-indigo-100/40">
                    <CareerIntelligence
                      userProfile={skillsProfile || resumeAnalysis ? {
                        skills: skillsProfile?.skills || resumeAnalysis?.skillsFound || [],
                        targetRole: skillsProfile?.targetRole || resumeAnalysis?.role || '',
                        experienceLevel: resumeAnalysis?.experienceLevel || userData.experienceLevel,
                        id: userId || undefined // Pass explicit user ID for socket room connection
                      } : undefined}
                      jobMatches={resumeAnalysis?.jobMatches || []}
                      savedTrajectory={resumeAnalysis?.careerTrajectory}
                      savedMarketReport={resumeAnalysis?.marketReport}
                      savedSalaryData={resumeAnalysis?.salaryData}
                      skillsProfile={skillsProfile}  // Pass full skills profile
                    />
                  </div>
                  <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-1 overflow-hidden border border-white/60 shadow-xl shadow-indigo-100/40">
                    <SkillsGapAnalysis
                      skills={resumeAnalysis?.skillsGap || []}
                      role={resumeAnalysis?.role || 'Software Engineer'}
                      userId={userId || undefined}
                    />
                  </div>
                </div>

                {/* Saved Roadmap Display */}
                {latestRoadmap && (
                  <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
                    <RoadmapDisplay roadmap={latestRoadmap} title="Your Active Learning Roadmap" />
                  </div>
                )}
              </div>
            )}

            {!lastAnalysisId && (
              <div className="space-y-8">
                {/* Personality Quiz / Assessment */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-1 border border-white/60 shadow-xl shadow-indigo-100/40">
                  <div className="p-8">
                    <PersonalityQuiz userData={userData} onUpdate={handleRefresh} skillsProfile={skillsProfile} />
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-12 text-center border border-white/60 shadow-xl shadow-indigo-100/40">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Target className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2 font-outfit">No Career Data Yet</h3>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto">Upload your resume to unlock detailed career intelligence and skills gap analysis.</p>
                  <button
                    onClick={() => setActiveTab('resume')}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
                  >
                    Go to Resume Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'simulations':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold font-outfit text-slate-800 mb-2">Career Simulations</h2>
                <p className="text-slate-500">Immersive roleplay scenarios to test your skills in real-time.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                  title="View simulation history"
                >
                  <Clock className="w-5 h-5" />
                </button>
                <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 transition-colors">
                  View All Scenarios <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Skills Profile Indicator */}
            {skillsProfile && skillsProfile.targetCompany && skillsProfile.targetRole && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500 rounded-full p-2">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        ✅ Using Your Saved Skills Profile
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        <strong>{skillsProfile.targetCompany}</strong> - <strong>{skillsProfile.targetRole}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-green-600 bg-green-100 px-3 py-1 rounded-full">
                    {skillsProfile.skills?.length || 0} skills • {skillsProfile.skillGaps?.length || 0} gaps
                  </div>
                </div>
              </div>
            )}

            {/* Horizontal Scroll Carousel Container */}
            <div className="relative group">
              <div className="flex overflow-x-auto pb-8 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory space-x-6">

                {/* New Simulation Card */}
                <div className="flex-shrink-0 w-80 snap-center">
                  <div
                    onClick={handleGenerateSimulation}
                    className={`bg-white/70 backdrop-blur-xl h-full rounded-3xl border-2 border-dashed ${isLoadingSimulations ? 'border-indigo-400 animate-pulse' : 'border-indigo-200 hover:border-indigo-400 hover:bg-white/80'} transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer group/card shadow-lg shadow-indigo-100/40`}
                  >
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6 group-hover/card:scale-110 transition-transform">
                      {isLoadingSimulations ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      ) : (
                        <Zap className="w-8 h-8 text-indigo-400 group-hover/card:text-indigo-600 transition-colors" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 text-center group-hover/card:text-indigo-600 transition-colors">
                      {isLoadingSimulations ? 'Analyzing Roadmap...' : 'Generate Scenario'}
                    </h3>
                    <p className="text-sm text-slate-500 text-center">
                      {isLoadingSimulations ? 'Creating personalized challenges...' : 'Create a custom AI simulation based on your target role.'}
                    </p>
                  </div>
                </div>

                {/* Mapped Simulation Cards */}
                {isLoadingSimulations ? (
                  <SimulationGridSkeleton />
                ) : (
                  dynamicSimulations.map((sim) => (
                    <div key={sim._id} className="flex-shrink-0 w-96 snap-center">
                      <SimulationCard
                        simulation={sim}
                        onStartMode={(id, mode) => handleStartSimulation(id, mode, sim.title)}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Fade Gradients for horizontal scroll indication - Adjusted for light theme */}
              <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/0 to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-white/0 to-transparent pointer-events-none" />
            </div>
          </div>
        );

      case 'mentorship':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[700px]">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl h-full overflow-hidden border border-white/60 shadow-xl shadow-indigo-100/40 flex flex-col">
              <div className="p-6 border-b border-indigo-100 bg-white/50">
                <h3 className="text-xl font-bold font-outfit text-slate-800 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-indigo-600" />
                  AI Career Mentor
                </h3>
              </div>
              <div className="flex-1 overflow-hidden">
                <AIMentorChat />
              </div>
            </div>
          </div>
        );

      case 'resume-intelligence':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[800px]">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl h-full overflow-hidden border border-white/60 shadow-xl shadow-indigo-100/40">
              <ResumeIntelligence onBadgeEarned={(badge) => setNewBadge(badge)} />
            </div>
          </div>
        );

      case 'resume':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-xl shadow-indigo-100/40">
              <ResumeUpload
                userId={userId || undefined}
                onAnalysisComplete={(data: any) => {
                  setResumeAnalysis(data);
                  setLastAnalysisId(data.analysisId);
                  setActiveTab('careers'); // Auto switch to careers after upload
                }}
              />
            </div>
            {resumeAnalysis && (
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-xl shadow-indigo-100/40">
                <ResumeOptimizer
                  resumeText="" // ResumeOptimizer generally needs text, but here we only have analysis data. We can omit if optional or pass empty.
                  targetRole={resumeAnalysis.role}
                />
              </div>
            )}
          </div>
        );

      case 'community':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-16 text-center border border-white/60 shadow-xl shadow-indigo-100/40">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-8 backdrop-blur-md border border-indigo-100">
                <User className="w-10 h-10 text-indigo-500" />
              </div>
              <h2 className="text-4xl font-bold font-outfit text-slate-800 mb-4">Community Hub</h2>
              <p className="text-xl text-slate-500 mb-8 max-w-lg mx-auto">Connect with other professionals, share achievements, and grow together. Coming soon.</p>
            </div>
          </div>
        );

      default:
        return <div>Tab content not found</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-full max-w-7xl px-4">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-slate-900 font-sans overflow-x-hidden selection:bg-indigo-500/30">
      {/* Animated Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none fixed">
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-indigo-300/20 rounded-full blur-[120px] mix-blend-multiply"
        />
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, 50, 0],
            scale: [1.1, 1, 1.1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-purple-300/20 rounded-full blur-[120px] mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
      </div>

      {/* Top Navigation Bar */}
      <nav className="relative z-50 border-b border-white/60 bg-white/70 backdrop-blur-xl sticky top-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <img src="/runagen-logo.svg" alt="Runa" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <span className="block text-xl font-black font-outfit tracking-tighter text-slate-800 uppercase leading-none">RUNA GEN</span>
                <span className="text-[10px] font-bold tracking-[0.2em] text-indigo-600 uppercase">Intelligence</span>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-4">
                <div className="px-4 py-2 bg-white/50 rounded-full border border-slate-200/60 flex items-center space-x-2 backdrop-blur-md shadow-sm">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                  <span className="text-slate-700 font-bold text-sm tracking-wide">{userData.streak?.current || 0} Day Streak</span>
                </div>
                <div className="px-4 py-2 bg-white/50 rounded-full border border-slate-200/60 flex items-center space-x-2 backdrop-blur-md shadow-sm">
                  <Zap className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                  <span className="text-slate-700 font-bold text-sm tracking-wide">{userData.xp} XP</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                >
                  <Settings className="w-6 h-6" />
                </button>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-[2px] shadow-lg shadow-indigo-500/20">
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {userData.profileImage ? (
                      <img src={userData.profileImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-indigo-700 font-bold">{userData.name?.[0] || 'U'}</span>
                    )}
                  </div>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Pills */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-1.5 rounded-full inline-flex space-x-1 overflow-x-auto max-w-full shadow-lg shadow-indigo-100/40">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview' },
              { id: 'careers', icon: Target, label: 'Career AI' },
              { id: 'simulations', icon: Play, label: 'Simulations' },
              { id: 'mentorship', icon: Brain, label: 'Mentor' },
              { id: 'resume-intelligence', icon: Sparkles, label: 'Intelligence' },
              { id: 'resume', icon: FileText, label: 'Resume' },
              { id: 'community', icon: User, label: 'Community' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                      flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300
                      ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-white/50'}
                    `}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : ''}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Profile Settings Drawer */}
      {showSettings && (
        <ProfileSettings
          onClose={() => setShowSettings(false)}
          initialData={userData as any}
          initialResumeData={resumeAnalysis}
          skillsProfile={skillsProfile}  // Pass skills profile
        />
      )}

      {/* Skill Learning Modal */}
      {selectedSkill && (
        <SkillLearningModal
          skill={selectedSkill}
          isOpen={showSkillModal}
          onClose={() => {
            setShowSkillModal(false);
            setSelectedSkill(null);
          }}
        />
      )}

      {/* Simulation Session Modal */}
      {showSessionModal && activeSessionInfo && (
        <SimulationSessionModal
          isOpen={showSessionModal}
          onClose={() => {
            setShowSessionModal(false);
            if (activeSessionInfo) {
              setActiveSessionInfo({ ...activeSessionInfo, isReset: false });
            }
            // Trigger a refresh of the dashboard data
            handleRefresh();
          }}
          simulationId={activeSessionInfo.id}
          modeId={activeSessionInfo.modeId}
          simulationTitle={activeSessionInfo.title}
          userId={userId || undefined}
          isReset={activeSessionInfo.isReset}
        />
      )}
      {/* Badge Unlock Modal */}
      {newBadge && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative border-4 border-indigo-100 shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setNewBadge(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>

            <div className="mb-6 flex justify-center">
              <ThreeBadge
                {...newBadge}
                size="xl"
                isEarned={true}
                userName={userData.name}
              />
            </div>

            <h3 className="text-2xl font-bold font-outfit text-indigo-900 mb-2">Congratulations!</h3>
            <p className="text-slate-600 mb-6">
              You've unlocked the <span className="font-bold text-indigo-600">{newBadge.name}</span> badge!
            </p>

            <button
              onClick={() => setNewBadge(null)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      <AnalysisHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectAnalysis={handleSelectAnalysis}
        currentAnalysisId={lastAnalysisId || undefined}
      />

      <CareerHistoryModal
        isOpen={showCareerHistoryModal}
        onClose={() => setShowCareerHistoryModal(false)}
        userId={userId || ''}
        onSelectItem={(item) => {
          console.log('Selected career history item:', item);
          setShowCareerHistoryModal(false);
          // TODO: Load the selected roadmap/trajectory into the UI
        }}
      />
    </div>
  );
};

export default Dashboard;