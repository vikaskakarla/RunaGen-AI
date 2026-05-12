import User from '../models/User.js';
import UserInteraction from '../models/UserInteraction.js';
import mongoose from 'mongoose';

const BADGE_DEFINITIONS = [
    { id: 'pathfinder', name: 'Pathfinder', description: 'Completed career assessment', icon: 'Compass', color: 'blue', rarity: 'common', type: 'strategist' },
    { id: 'skill-explorer', name: 'Skill Explorer', description: 'Completed first skill in roadmap', icon: 'Star', color: 'purple', rarity: 'common', type: 'innovator' },
    { id: 'consistency-champ', name: 'Consistency Champion', description: '7 day streak', icon: 'Target', color: 'green', rarity: 'rare', type: 'consistency' },
    { id: 'career-simulator-pro', name: 'Career Simulator Pro', description: '3 different career simulations', icon: 'Zap', color: 'orange', rarity: 'rare', type: 'master' },
    { id: 'mentor-master', name: 'Mentor Master', description: '5 AI mentor sessions', icon: 'Brain', color: 'pink', rarity: 'epic', type: 'mentee' },
    { id: 'peer-supporter', name: 'Peer Supporter', description: 'Helped 10 peers by reviewing their resumes', icon: 'Users', color: 'indigo', rarity: 'epic', type: 'community' },
    { id: 'code-warrior', name: 'Code Warrior', description: 'Successfully completed all coding challenges', icon: 'Code', color: 'red', rarity: 'legendary', type: 'coder' },
    { id: 'data-wizard', name: 'Data Wizard', description: 'Mastered data analysis simulations and tools', icon: 'Database', color: 'yellow', rarity: 'legendary', type: 'analyst' },
    { id: 'security-guardian', name: 'Security Guardian', description: 'Completed advanced cybersecurity challenges', icon: 'Shield', color: 'teal', rarity: 'legendary', type: 'guardian' },
    { id: 'career-champion', name: 'Career Champion', description: 'Ultimate achievement - completed entire career roadmap', icon: 'Trophy', color: 'cyan', rarity: 'mythic', type: 'champion' }
];

export class AnalyticsService {
    setSocket(io) {
        this.io = io;
    }

    /**
     * Track user activity and check for badges
     */
    async trackActivity(userId, type, details = {}, points = 0) {

        try {
            // Create details object with points
            const interactionDetails = { ...details, points };

            // 1. Log the interaction
            const interaction = new UserInteraction({
                userId,
                sessionId: details.sessionId || new mongoose.Types.ObjectId().toString(),
                interactionType: type,
                action: details.action || type,
                details: interactionDetails,
                metadata: {
                    timestamp: new Date()
                }
            });
            await interaction.save();

            // 2. Update user XP and recent activity
            let user = null;
            let activityEntry = {
                type,
                title: details.title || type,
                points,
                timestamp: new Date()
            };

            try {
                if (mongoose.Types.ObjectId.isValid(userId)) {
                    user = await User.findById(userId);
                } else {
                    // Find or create guest user by session ID (stored in fullName)
                    user = await User.findOne({ fullName: userId });
                    if (!user) {
                        console.log(`Analytics: Creating new persistent guest document for ${userId}`);
                        user = new User({
                            fullName: userId,
                            email: `${userId.replace(/\s+/g, '_').toLowerCase()}@guest.placeholder`, // Unique email to bypass non-sparse index issues
                            careerInterest: 'Guest Track',
                            xp: 0,
                            level: 1,
                            xpToNext: 1000,
                            recentActivity: []
                        });
                    }
                }
            } catch (error) {
                console.error('Analytics: Error finding/creating user:', error);
            }

            if (user) {
                user.xp = (user.xp || 0) + points;

                // Level up logic
                const nextLevelXp = (user.level || 1) * 1000;
                if (user.xp >= nextLevelXp) {
                    user.level = (user.level || 1) + 1;
                    user.xpToNext = (user.level) * 1000;
                }

                // --- NEW: Streak & Daily Stats Integration ---
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];

                // 1. Update Daily Stats (Heatmap)
                if (!user.dailyStats) user.dailyStats = [];
                let todayStat = user.dailyStats.find(s => s.date === todayStr);
                if (todayStat) {
                    todayStat.count = (todayStat.count || 0) + 1;
                } else {
                    user.dailyStats.push({ date: todayStr, count: 1, minutes: 0 });
                }

                // Keep only last 365 days of stats
                if (user.dailyStats.length > 365) {
                    user.dailyStats = user.dailyStats.slice(-365);
                }

                // 2. Update Streak
                if (!user.streak) {
                    user.streak = { current: 1, max: 1, lastActivityDate: now };
                } else {
                    const lastDate = user.streak.lastActivityDate ? new Date(user.streak.lastActivityDate) : null;
                    if (!lastDate) {
                        user.streak.current = 1;
                        user.streak.lastActivityDate = now;
                    } else {
                        const lastDateStr = lastDate.toISOString().split('T')[0];
                        if (lastDateStr !== todayStr) {
                            const yesterday = new Date(now);
                            yesterday.setDate(now.getDate() - 1);
                            const yesterdayStr = yesterday.toISOString().split('T')[0];

                            if (lastDateStr === yesterdayStr) {
                                // Continued streak
                                user.streak.current = (user.streak.current || 0) + 1;
                            } else {
                                // Streak broken
                                user.streak.current = 1;
                            }
                            user.streak.lastActivityDate = now;
                        }
                        // If lastDateStr === todayStr, we don't increment, just keep it
                    }
                    if (user.streak.current > (user.streak.max || 0)) {
                        user.streak.max = user.streak.current;
                    }
                }
                // --- END NEW LOGIC ---

                // 3. Update Weekly Stats in Real-time
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                // Get weekly interactions from database
                const weeklyInteractions = await UserInteraction.find({
                    userId: user._id,
                    createdAt: { $gte: oneWeekAgo }
                });

                // Calculate weekly stats
                const weeklyStats = {
                    simulations: weeklyInteractions.filter(i => i.interactionType === 'simulation' || i.interactionType === 'simulation_interaction').length,
                    mentorChats: weeklyInteractions.filter(i => i.interactionType === 'mentor_chat').length,
                    xpEarned: weeklyInteractions.reduce((sum, i) => sum + (i.details?.points || 0), 0)
                };

                // Add current activity to weekly stats if it's one of the tracked types
                if (type === 'simulation' || type === 'simulation_interaction') {
                    weeklyStats.simulations += 1;
                } else if (type === 'mentor_chat') {
                    weeklyStats.mentorChats += 1;
                }
                weeklyStats.xpEarned += points;

                console.log(`📊 Analytics: Updated weeklyStats for ${userId}:`, weeklyStats);

                // Store weekly stats on user document (we'll need to add this field to the schema)
                user.weeklyStats = weeklyStats;

                // Add to recent activity
                if (!user.recentActivity) user.recentActivity = [];
                user.recentActivity.unshift(activityEntry);

                // Keep only last 10
                if (user.recentActivity.length > 10) {
                    user.recentActivity = user.recentActivity.slice(0, 10);
                }
            }

            // 3. Check for badges
            const newBadges = user ? await this.checkBadgeEligibility(user, type, details) : [];
            if (user && newBadges.length > 0) {
                // Award badges
                for (const badgeData of newBadges) {
                    if (!user.badges.find(b => b.id === badgeData.id)) {
                        console.log(`Analytics: Awarding badge ${badgeData.id} to user ${userId}: ${badgeData.name}`);
                        user.badges.push({
                            ...badgeData,
                            earned: true,
                            unlockedAt: new Date()
                        });

                        // Add badge achievement to recent activity
                        const badgeEntry = {
                            type: 'badge',
                            title: `Earned ${badgeData.name} Badge`,
                            points: 500, // Bonus XP for badge
                            timestamp: new Date()
                        };
                        user.recentActivity.unshift(badgeEntry);
                        user.xp += 500;
                    }
                }
            }

            if (user) {
                await user.save();

                // Real-time Update
                if (this.io) {
                    this.io.emit(`user_update_${userId}`, { type: 'activity', data: activityEntry });

                    // Also emit stats update if XP changed or badges earned
                    if (points > 0 || (user && newBadges.length > 0)) {
                        this.io.emit(`user_update_${userId}`, { type: 'stats_update' });
                    }
                }
            }

            return {
                user,
                newBadges,
                activity: activityEntry,
                success: true
            };
        } catch (error) {
            console.error('Error tracking activity:', error);
            return null;
        }
    }

    /**
     * Check which badges a user is eligible for
     */
    async checkBadgeEligibility(user, triggerType, details) {
        const eligibleBadges = [];
        const interactions = await UserInteraction.find({ userId: user._id });

        for (const badge of BADGE_DEFINITIONS) {
            // Skip if already earned
            if (user.badges.find(b => b.id === badge.id)) continue;

            let isEligible = false;

            switch (badge.id) {
                case 'pathfinder':
                    if (triggerType === 'resume_upload' || interactions.some(i => i.interactionType === 'resume_upload')) {
                        isEligible = true;
                    }
                    break;

                case 'skill-explorer':
                    if (triggerType === 'skill_exploration' || interactions.some(i => i.interactionType === 'skill_exploration' || i.interactionType === 'quiz')) {
                        isEligible = true;
                    }
                    break;

                case 'mentor-master':
                    const mentorSessions = interactions.filter(i => i.interactionType === 'mentor_chat').length;
                    if (mentorSessions >= 5) {
                        isEligible = true;
                    }
                    break;

                case 'career-simulator-pro':
                    const simulations = interactions.filter(i => i.interactionType === 'simulation').length;
                    if (simulations >= 3) {
                        isEligible = true;
                    }
                    break;

                case 'consistency-champ':
                    // Check strict 7-day streak
                    if (user.streak && user.streak.current >= 7) {
                        isEligible = true;
                    }
                    break;

                case 'peer-supporter':
                    const reviews = interactions.filter(i => i.interactionType === 'peer_review').length;
                    if (reviews >= 10) {
                        isEligible = true;
                    }
                    break;

                case 'code-warrior':
                    const codeChallenges = interactions.filter(i => i.interactionType === 'code_challenge').length;
                    if (codeChallenges >= 10) {
                        isEligible = true;
                    }
                    break;

                case 'data-wizard':
                    const dataSims = interactions.filter(i => i.interactionType === 'simulation' && i.details?.category === 'Data').length;
                    // Or check for specific data skills mastered
                    if (dataSims >= 5) {
                        isEligible = true;
                    }
                    break;

                case 'security-guardian':
                    const securityChallenges = interactions.filter(i => i.interactionType === 'security_challenge').length;
                    if (securityChallenges >= 12) {
                        isEligible = true;
                    }
                    break;

                case 'career-champion':
                    // Needs to have earned key badges
                    const hasPathfinder = user.badges.some(b => b.id === 'pathfinder');
                    const hasSkill = user.badges.some(b => b.id === 'skill-explorer');
                    const hasSim = user.badges.some(b => b.id === 'career-simulator-pro');
                    const hasMentor = user.badges.some(b => b.id === 'mentor-master');

                    if (hasPathfinder && hasSkill && hasSim && hasMentor && user.level >= 10) {
                        isEligible = true;
                    }
                    break;
            }

            if (isEligible) {
                eligibleBadges.push(badge);
            }
        }

        return eligibleBadges;
    }

    /**
     * Get formatted analytics for the dashboard
     */
    async getUserAnalytics(userId) {
        try {
            const interactions = await UserInteraction.getUserInteractions(userId, 365);
            const engagement = await UserInteraction.getUserEngagement(userId);

            let user = null;
            if (mongoose.Types.ObjectId.isValid(userId)) {
                user = await User.findById(userId).select('badges xp level recentActivity weeklyStats');
            } else {
                user = await User.findOne({ fullName: userId }).select('badges xp level recentActivity weeklyStats');
            }

            // Calculate streak
            let streak = 0;
            if (engagement.length > 0) {
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();

                const dates = engagement.map(e => e.date.toDateString());

                if (dates.includes(today) || dates.includes(yesterday)) {
                    streak = 1;
                    // Count backwards
                    for (let i = 1; i < engagement.length; i++) {
                        const d1 = engagement[i - 1].date;
                        const d2 = engagement[i].date;
                        const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
                        if (diff <= 1.1) { // Allowance for small time diffs
                            streak++;
                        } else {
                            break;
                        }
                    }
                }
            }

            // Map to heatmap format
            const heatmap = engagement.map(e => ({
                date: e.date,
                count: e.interactions
            }));

            // Use stored weeklyStats from user model (updated in real-time by trackActivity)
            // Fallback to calculating if not present (for backward compatibility)
            let weeklyStats = user.weeklyStats;
            if (!weeklyStats || (weeklyStats.simulations === 0 && weeklyStats.mentorChats === 0 && weeklyStats.xpEarned === 0)) {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const weeklyInteractions = interactions.filter(i => new Date(i.createdAt) >= oneWeekAgo);
                weeklyStats = {
                    simulations: weeklyInteractions.filter(i => i.interactionType === 'simulation' || i.interactionType === 'simulation_interaction').length,
                    mentorChats: weeklyInteractions.filter(i => i.interactionType === 'mentor_chat').length,
                    xpEarned: weeklyInteractions.reduce((sum, i) => sum + (i.details?.points || 0), 0)
                };
            }

            return {
                streak: {
                    current: streak,
                    best: streak // For now simple
                },
                heatmap,
                totalInteractions: interactions.length,
                badges: user.badges,
                xp: user.xp,
                level: user.level,
                recentActivity: user.recentActivity,
                weeklyStats // Return weekly stats (now from stored value)
            };
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    }
}

export const analyticsService = new AnalyticsService();
