import User from '../models/User.js';

class BadgeService {
    constructor() {
        this.badges = [
            {
                id: 'pathfinder',
                name: 'Pathfinder',
                action: 'generate_career_trajectory',
                condition: () => true // Always unlock on first career generation
            },
            {
                id: 'skill-explorer',
                name: 'Skill Explorer',
                action: 'generate_roadmap',
                condition: () => true
            },
            {
                id: 'consistency-champ',
                name: 'Consistency Champion',
                action: 'login',
                condition: (user) => user.streak && user.streak.current >= 7
            },
            {
                id: 'salary-scout', // New badge for salary
                name: 'Salary Scout',
                action: 'generate_salary',
                condition: () => true
            },
            {
                id: 'resume-guru',
                name: 'Resume Guru',
                action: 'optimize_resume',
                condition: () => true
            }
        ];
    }

    setSocket(io) {
        this.io = io;
    }

    /**
     * Check and unlock badges for a user based on an action.
     * @param {string} userId - The ID of the user.
     * @param {string} action - The action performed (e.g., 'generate_career_trajectory').
     * @returns {Promise<Array>} - List of newly unlocked badges.
     */
    async checkBadges(userId, action) {
        try {
            if (!userId) return [];

            const user = await User.findById(userId);
            if (!user) return [];

            // Find badges relevant to this action
            const potentialBadges = this.badges.filter(b => b.action === action);
            const unlockedBadges = [];

            // Check if user already has these badges
            const existingBadgeIds = new Set(user.badges.map(b => b.id));

            for (const badgeDef of potentialBadges) {
                if (!existingBadgeIds.has(badgeDef.id)) {
                    // Check condition
                    if (badgeDef.condition(user)) {
                        const newBadge = {
                            id: badgeDef.id,
                            name: badgeDef.name,
                            earned: true,
                            unlockedAt: new Date(),
                            icon: this.getIconForBadge(badgeDef.id),
                            description: this.getDescriptionForBadge(badgeDef.id),
                            rarity: this.getRarityForBadge(badgeDef.id),
                            color: this.getColorForBadge(badgeDef.id),
                            type: 'achievement'
                        };

                        user.badges.push(newBadge);
                        unlockedBadges.push(newBadge);

                        // Award XP
                        user.xp = (user.xp || 0) + 500;
                        user.xpToNext = Math.max(0, (user.xpToNext || 1000) - 500);
                    }
                }
            }

            if (unlockedBadges.length > 0) {
                await user.save();
                console.log(`🏆 User ${userId} unlocked badges: ${unlockedBadges.map(b => b.name).join(', ')}`);

                // Real-time Update
                if (this.io) {
                    this.io.emit(`user_update_${userId}`, { type: 'stats_update', badges: unlockedBadges });
                    this.io.emit(`user_update_${userId}`, {
                        type: 'activity',
                        data: {
                            type: 'badge',
                            title: `Earned ${unlockedBadges[0].name}`,
                            timestamp: new Date()
                        }
                    });
                }
            }

            return unlockedBadges;
        } catch (error) {
            console.error('Error checking badges:', error);
            return [];
        }
    }

    getIconForBadge(id) {
        const map = {
            'pathfinder': 'Compass',
            'skill-explorer': 'Star',
            'consistency-champ': 'Target',
            'salary-scout': 'DollarSign'
        };
        return map[id] || 'Award';
    }

    getDescriptionForBadge(id) {
        const map = {
            'pathfinder': 'Completed career assessment and discovered your path.',
            'skill-explorer': 'Generated a learning roadmap to master new skills.',
            'consistency-champ': 'Logged in for 7 consecutive days!',
            'salary-scout': 'Researched salary insights for your target role.',
            'resume-guru': 'Optimized your resume with AI assistance.'
        };
        return map[id] || 'Achievement unlocked.';
    }

    getRarityForBadge(id) {
        const map = {
            'pathfinder': 'common',
            'skill-explorer': 'common',
            'consistency-champ': 'rare',
            'salary-scout': 'common',
            'resume-guru': 'rare'
        };
        return map[id] || 'common';
    }

    getColorForBadge(id) {
        const map = {
            'pathfinder': 'blue',
            'skill-explorer': 'purple',
            'consistency-champ': 'green',
            'salary-scout': 'yellow',
            'resume-guru': 'indigo'
        };
        return map[id] || 'blue';
    }
}

export const badgeService = new BadgeService();
