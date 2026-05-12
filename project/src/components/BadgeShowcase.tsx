import React, { useState, useEffect } from 'react';
import { Star, Target, Zap, Trophy, Compass, Brain, Users, Code, Database, Shield, TrendingUp, FileText } from 'lucide-react';

const API_BASE = (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

import ThreeBadge from './ThreeBadge';
import BadgeShowcaseSkeleton from './BadgeShowcaseSkeleton';

const BadgeShowcase: React.FC<{ embedded?: boolean; user?: any }> = ({ embedded = true, user }) => {
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const [badgeProgress, setBadgeProgress] = useState<Record<string, number>>({});
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [earnedDates, setEarnedDates] = useState<Record<string, string>>({});
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    // Prefer passed prop, fallback to localStorage
    if (user) {
      setUserName(user.name || user.firstName || 'User');
    } else {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const parsedUser = JSON.parse(userJson);
          setUserName(parsedUser.firstName || parsedUser.name || 'User');
        } catch (e) {
          console.error('Error parsing user data', e);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();

    // Get user name
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        setUserName(user.firstName || user.name || 'User');
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }, []);

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const userId = user?.id || localStorage.getItem('userId') || localStorage.getItem('temp_user_id') || 'anonymous';

    // Allow anonymous to fetch analytics without a token
    if (!token && userId !== 'anonymous') {
      setIsLoading(false);
      return;
    }

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userId) headers['x-user-id'] = userId;

      const response = await fetch(`${API_BASE}/api/user/analytics`, {
        headers
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.analytics);

        // Extract earned badges and dates
        const earned = new Set<string>();
        const dates: Record<string, string> = {};
        const progress: Record<string, number> = {};

        data.analytics.badges.forEach((b: any) => {
          if (b.earned) {
            earned.add(b.id);
            dates[b.id] = b.earnedDate || b.date || new Date().toISOString();
            progress[b.id] = 100;
          }
        });

        setEarnedBadges(earned);
        setEarnedDates(dates);
        setBadgeProgress(progress);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };
  // ... existing badges array ...

  // Update render loops to pass props
  /* 
     NOTE for tool: I am replacing the render loops below. 
     I need to match the exact content to be replaced.
     Since I cannot replace multiple disparate blocks in one ReplaceFileContent call easily without MultiReplace
     and avoiding context errors, I will focus on updating the state logic first (above) and then use a separate call 
     or a broader replace to update the usages.
     
     Actually, let's just update the state declarations and fetch logic first.
  */

  const badges = [
    { id: 'pathfinder', name: 'Pathfinder', description: 'Completed personality test and discovered your career direction', requirement: 'Complete career assessment', icon: Compass, color: 'blue', rarity: 'common', topMetric: 'Explorer', leftMetric: '100 XP', rightMetric: 'Tier 1', bottomMetric: 'Unlocked' },
    { id: 'skill-explorer', name: 'Skill Explorer', description: 'Completed your first skill in the roadmap', requirement: 'Complete first skill', icon: Star, color: 'purple', rarity: 'common', topMetric: 'Learner', leftMetric: '150 XP', rightMetric: 'Tier 1', bottomMetric: 'Active' },
    { id: 'consistency-champ', name: 'Consistency Champion', description: 'Logged in and made progress for 7 days straight', requirement: '7 day streak', icon: Target, color: 'green', rarity: 'rare', topMetric: 'Streak', leftMetric: '4/7 days', rightMetric: 'Tier 2', bottomMetric: '60%' },
    { id: 'career-simulator-pro', name: 'Career Simulator Pro', description: 'Completed 3 different career simulations', requirement: '3 simulations', icon: Zap, color: 'orange', rarity: 'rare', topMetric: 'Simulator', leftMetric: '1/3 done', rightMetric: 'Tier 2', bottomMetric: '33%' },
    { id: 'mentor-master', name: 'Mentor Master', description: 'Received 5 AI mentor sessions and implemented feedback', requirement: '5 mentor sessions', icon: Brain, color: 'pink', rarity: 'epic', topMetric: 'Mentee', leftMetric: '4/5 done', rightMetric: 'Tier 3', bottomMetric: '80%' },
    { id: 'peer-supporter', name: 'Peer Supporter', description: 'Helped 10 peers by reviewing their resumes', requirement: 'Help 10 peers', icon: Users, color: 'indigo', rarity: 'epic', topMetric: 'Helper', leftMetric: '4/10 helped', rightMetric: 'Tier 3', bottomMetric: '45%' },
    { id: 'code-warrior', name: 'Code Warrior', description: 'Successfully completed all coding challenges', requirement: '10 code challenges', icon: Code, color: 'red', rarity: 'legendary', topMetric: 'Coder', leftMetric: '2/10 done', rightMetric: 'Tier 4', bottomMetric: '25%' },
    { id: 'resume-guru', name: 'Resume Guru', description: 'Optimized your resume with AI analysis', requirement: 'Optimize resume', icon: FileText, color: 'indigo', rarity: 'rare', topMetric: 'Optimizer', leftMetric: '1/1 done', rightMetric: 'Tier 2', bottomMetric: 'Unlocked' },
    { id: 'data-wizard', name: 'Data Wizard', description: 'Mastered data analysis simulations and tools', requirement: 'Master data skills', icon: Database, color: 'yellow', rarity: 'legendary', topMetric: 'Analyst', leftMetric: '1/8 skills', rightMetric: 'Tier 4', bottomMetric: '15%' },
    { id: 'security-guardian', name: 'Security Guardian', description: 'Completed advanced cybersecurity challenges', requirement: 'Security mastery', icon: Shield, color: 'teal', rarity: 'legendary', topMetric: 'Guardian', leftMetric: '0/12 done', rightMetric: 'Tier 4', bottomMetric: 'Locked' },
    { id: 'career-champion', name: 'Career Champion', description: 'Ultimate achievement - completed entire career roadmap', requirement: 'Complete all goals', icon: Trophy, color: 'cyan', rarity: 'mythic', topMetric: 'Champion', leftMetric: '1/15 goals', rightMetric: 'Tier 5', bottomMetric: '10%' }
  ];

  const getBadgeGradientForColor = (color: string) => {
    const gradients: Record<string, string> = {
      blue: 'from-blue-400 via-blue-500 to-blue-600',
      purple: 'from-purple-400 via-purple-500 to-purple-600',
      green: 'from-green-400 via-green-500 to-green-600',
      orange: 'from-orange-400 via-orange-500 to-orange-600',
      pink: 'from-pink-400 via-pink-500 to-pink-600',
      indigo: 'from-indigo-400 via-indigo-500 to-indigo-600',
      red: 'from-red-400 via-red-500 to-red-600',
      yellow: 'from-yellow-400 via-yellow-500 to-yellow-600',
      teal: 'from-teal-400 via-teal-500 to-teal-600',
      cyan: 'from-cyan-400 via-cyan-500 to-cyan-600'
    };
    return gradients[color] || gradients.blue;
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'text-gray-400 border-gray-500/50 bg-gray-500/10',
      rare: 'text-blue-400 border-blue-500/50 bg-blue-500/10',
      epic: 'text-purple-400 border-purple-500/50 bg-purple-500/10',
      legendary: 'text-orange-400 border-orange-500/50 bg-orange-500/10',
      mythic: 'text-pink-400 border-pink-500/50 bg-pink-500/10'
    };
    return colors[rarity] || colors.common;
  };

  const today = new Date();
  const daysBack = 371; // 53 weeks * 7 days to fill the grid completely

  type DayCell = { date: Date; count: number };

  const contributionData: DayCell[] = Array.from({ length: daysBack }, (_, i) => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (daysBack - 1 - i));

    // Check if we have real data for this date
    if (analyticsData && analyticsData.heatmap) {
      const realDay = analyticsData.heatmap.find((h: any) =>
        new Date(h.date).toDateString() === d.toDateString()
      );
      if (realDay) return { date: d, count: realDay.count };
    }

    return { date: d, count: 0 };
  });

  const getColorClassForCount = (count: number): string => {
    if (count <= 0) return 'bg-slate-100 border-slate-200';
    if (count === 1) return 'bg-emerald-100 border-emerald-200';
    if (count === 2) return 'bg-emerald-200 border-emerald-300';
    if (count === 3) return 'bg-emerald-300 border-emerald-400';
    return 'bg-emerald-400 border-emerald-500';
  };

  const { current, best, daysActiveThisYear } = analyticsData ? {
    current: analyticsData.streak.current,
    best: analyticsData.streak.best,
    daysActiveThisYear: analyticsData.heatmap.length
  } : { current: 0, best: 0, daysActiveThisYear: 0 };

  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const contributionMap = new Map(contributionData.map(dc => [dc.date.toDateString(), dc.count]));
  const weekCounts = weekDays.map(d => contributionMap.get(d.toDateString()) || 0);



  // ... inside component
  if (isLoading) {
    return <BadgeShowcaseSkeleton />;
  }

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} px-4 py-4`}>
      <div className="max-w-7xl mx-auto">
        {/* Stats Grid - Better spacing */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-gray-900 mb-1">{earnedBadges.size}</div>
            <div className="text-gray-500 text-sm">Badges Earned</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-gray-900 mb-1">{badges.length}</div>
            <div className="text-gray-500 text-sm">Total Available</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-gray-900 mb-1">{Math.round((earnedBadges.size / badges.length) * 100)}%</div>
            <div className="text-gray-500 text-sm">Achievement Rate</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-gray-500 text-sm">Trend</div>
          </div>
        </div>

        {/* Badges Grid - Fixed spacing and centering */}
        <div className="space-y-16 mb-12">
          {/* First row - 4 badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
            {badges.slice(0, 4).map((badge) => (
              <div key={badge.id} className="flex flex-col items-center space-y-6 px-4 py-6">
                <ThreeBadge
                  {...badge}
                  icon={badge.icon}
                  isEarned={earnedBadges.has(badge.id)}
                  earnedDate={earnedDates[badge.id]}
                  userName={userName}
                  onClick={() => setSelectedBadge(badge)}
                  size="lg"
                />
                <div className="text-center space-y-2 max-w-[180px]">
                  <div className="text-slate-800 text-sm font-medium leading-tight">{badge.name}</div>
                  <div className={`inline-block text-xs px-3 py-1 rounded-full border ${getRarityColor(badge.rarity)} capitalize`}>
                    {badge.rarity}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Second row - 4 badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
            {badges.slice(4, 8).map((badge) => (
              <div key={badge.id} className="flex flex-col items-center space-y-6 px-4 py-6">
                <ThreeBadge
                  {...badge}
                  icon={badge.icon}
                  isEarned={earnedBadges.has(badge.id)}
                  earnedDate={earnedDates[badge.id]}
                  userName={userName}
                  onClick={() => setSelectedBadge(badge)}
                  size="lg"
                />
                <div className="text-center space-y-2 max-w-[180px]">
                  <div className="text-slate-800 text-sm font-medium leading-tight">{badge.name}</div>
                  <div className={`inline-block text-xs px-3 py-1 rounded-full border ${getRarityColor(badge.rarity)} capitalize`}>
                    {badge.rarity}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Third row - 2 badges centered */}
          <div className="flex justify-center gap-16">
            {badges.slice(8).map((badge) => (
              <div key={badge.id} className="flex flex-col items-center space-y-6 px-4 py-6">
                <ThreeBadge
                  {...badge}
                  icon={badge.icon}
                  isEarned={earnedBadges.has(badge.id)}
                  onClick={() => setSelectedBadge(badge)}
                  size="lg"
                />
                <div className="text-center space-y-2 max-w-[180px]">
                  <div className="text-slate-800 text-sm font-medium leading-tight">{badge.name}</div>
                  <div className={`inline-block text-xs px-3 py-1 rounded-full border ${getRarityColor(badge.rarity)} capitalize`}>
                    {badge.rarity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Streak + Contribution Grid */}
        <div className="mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Streak summary */}
            <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Current Streak</div>
                  <div className="text-3xl font-bold text-gray-900">{current} days</div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div className="font-medium text-gray-700 mb-1">Best</div>
                  <div className="text-lg font-semibold text-green-700">{best} days</div>
                </div>
              </div>

              {/* Weekly row */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="w-8 text-center">{d}</div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {weekCounts.map((c, i) => (
                    <div key={i} className={`w-8 h-6 rounded-md border ${getColorClassForCount(c)}`} title={`${weekDays[i].toDateString()} • ${c} activities`} />
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">This week</div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Active days</div>
                  <div className="text-lg font-semibold text-gray-900">{daysActiveThisYear}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Badges</div>
                  <div className="text-lg font-semibold text-gray-900">{earnedBadges.size}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Rate</div>
                  <div className="text-lg font-semibold text-gray-900">{Math.round((earnedBadges.size / badges.length) * 100)}%</div>
                </div>
              </div>
            </div>

            {/* Contribution grid */}
            <div className="lg:col-span-3">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-slate-700 font-bold font-outfit">
                    Activity from {(() => {
                      const start = new Date(today);
                      start.setDate(today.getDate() - daysBack);
                      return start.toLocaleString(undefined, { month: 'short', year: 'numeric' });
                    })()} to {today.toLocaleString(undefined, { month: 'short', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Less</span>
                    <span className="w-3 h-3 rounded-sm border border-slate-200 bg-slate-100" />
                    <span className="w-3 h-3 rounded-sm border border-emerald-200 bg-emerald-100" />
                    <span className="w-3 h-3 rounded-sm border border-emerald-300 bg-emerald-200" />
                    <span className="w-3 h-3 rounded-sm border border-emerald-400 bg-emerald-300" />
                    <span className="w-3 h-3 rounded-sm border border-emerald-500 bg-emerald-400" />
                    <span>More</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {/* Month labels row */}
                  <div className="flex mb-1">
                    <div className="w-8 mr-2 shrink-0"></div> {/* Spacer for alignment */}
                    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(53, 14px)` }}>
                      {(() => {
                        const end = new Date(today);
                        end.setHours(0, 0, 0, 0);
                        const start = new Date(end);
                        start.setDate(end.getDate() - (52 * 7 + end.getDay()));
                        const monthLabels: React.ReactNode[] = [];
                        for (let c = 0; c < 53; c++) {
                          const colDate = new Date(start);
                          colDate.setDate(start.getDate() + c * 7);
                          const prevColDate = new Date(start);
                          prevColDate.setDate(start.getDate() + (c - 1) * 7);
                          const show = c === 0 || colDate.getMonth() !== prevColDate.getMonth();
                          monthLabels.push(
                            <div key={c} className="w-[14px] h-4 text-center text-[10px] text-slate-400 relative overflow-visible flex-shrink-0">
                              {show && (
                                <span className="absolute left-1/2 -translate-x-1/2 top-0 whitespace-nowrap">
                                  {colDate.toLocaleString(undefined, { month: 'short' })}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return monthLabels;
                      })()}
                    </div>
                  </div>

                  <div className="flex">
                    {/* Weekday labels */}
                    <div className="flex flex-col mr-2 text-[10px] text-slate-400 select-none w-8 shrink-0 text-right pr-1">
                      {['Sun', 'Tue', 'Thu', 'Sat'].map((d, i) => (
                        <div key={i} className={`h-[14px] leading-[14px] ${i === 3 ? '' : 'mb-0.5'}`}>{d}</div>
                      ))}
                    </div>

                    {/* Grid */}
                    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(53, 14px)` }}>
                      {(() => {
                        const end = new Date(today); end.setHours(0, 0, 0, 0);
                        const start = new Date(end); start.setDate(end.getDate() - (52 * 7 + end.getDay()));
                        const cells: React.ReactNode[] = [];
                        for (let col = 0; col < 53; col++) {
                          const colCells: React.ReactNode[] = [];
                          for (let row = 0; row < 7; row++) {
                            const cellDate = new Date(start);
                            cellDate.setDate(start.getDate() + col * 7 + row);
                            const cnt = contributionMap.get(cellDate.toDateString()) || 0;
                            const color = getColorClassForCount(cnt);
                            colCells.push(
                              <div key={row} title={`${cellDate.toDateString()} • ${cnt} activities`} className={`w-3.5 h-3.5 rounded-[3px] border ${color} ${row === 6 ? '' : 'mb-0.5'}`} />
                            );
                          }
                          cells.push(<div key={col} className="grid gap-0.5" style={{ gridTemplateRows: `repeat(7, 14px)` }}>{colCells}</div>);
                        }
                        return cells;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">Activity heatmap based on your recent actions.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full relative border border-gray-200 shadow-2xl">
              <button onClick={() => setSelectedBadge(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">✕</button>

              <div className="text-center">
                <div className="mb-8 flex justify-center">
                  <ThreeBadge
                    {...selectedBadge}
                    icon={selectedBadge.icon}
                    isEarned={earnedBadges.has(selectedBadge.id)}
                    size="xl"
                    userName={userName}
                  />
                </div>

                <h3 className="text-3xl font-bold text-gray-900 mb-3">{selectedBadge.name}</h3>

                <div className={`inline-block px-4 py-2 rounded-full border ${getRarityColor(selectedBadge.rarity)} capitalize mb-6 text-sm font-medium`}>
                  {selectedBadge.rarity} Badge
                </div>

                <p className="text-gray-700 leading-relaxed mb-8 text-lg">{selectedBadge.description}</p>

                <div className="mb-8">
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Progress</span>
                    <span>{badgeProgress[selectedBadge.id] || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={`bg-gradient-to-r ${getBadgeGradientForColor(selectedBadge.color)} h-3 rounded-full transition-all duration-1000`} style={{ width: `${badgeProgress[selectedBadge.id] || 0}%` }} />
                  </div>
                </div>

                {earnedBadges.has(selectedBadge.id) ? (
                  <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-green-700 font-medium text-lg">🏆 Achievement Unlocked!</div>
                    <div className="text-green-600 text-sm mt-2">Badge earned and ready to showcase</div>
                  </div>
                ) : (
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-blue-800 font-medium mb-2">📋 Requirement:</div>
                    <div className="text-blue-700 text-sm">{selectedBadge.requirement}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeShowcase;