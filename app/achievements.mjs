// Achievement System for WWTBAM
// Defines achievements and provides checking logic

export const achievementDefinitions = {
  first_win: {
    id: "first_win",
    name: "First Victory",
    description: "Win your first game",
    icon: "🏆",
    condition: (user) => user.stats.gamesWon >= 1
  },

  millionaire: {
    id: "millionaire",
    name: "Millionaire",
    description: "Reach the final question (level 15)",
    icon: "💰",
    condition: (user) => user.stats.highestLevel >= 15
  },

  perfect_game: {
    id: "perfect_game",
    name: "Perfect Game",
    description: "Win without using any lifelines",
    icon: "⭐",
    condition: (user) => {
      const totalLifelines = user.stats.lifelinesUsed.fifty_fifty +
                            user.stats.lifelinesUsed.ask_audience +
                            user.stats.lifelinesUsed.phone_friend;
      return user.stats.gamesWon >= 1 && totalLifelines === 0;
    }
  },

  speed_demon: {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Win a game in under 5 minutes",
    icon: "⚡",
    condition: (user) => user.stats.fastestWin !== null && user.stats.fastestWin < 5 * 60 * 1000
  },

  safe_player: {
    id: "safe_player",
    name: "Safe Player",
    description: "Walk away with your winnings 5 times",
    icon: "🛡️",
    condition: (user) => user.stats.walkedAway >= 5
  },

  high_roller: {
    id: "high_roller",
    name: "High Roller",
    description: "Accumulate $1,000,000 in total winnings",
    icon: "💎",
    condition: (user) => user.stats.totalWinnings >= 1000000
  },

  social_butterfly: {
    id: "social_butterfly",
    name: "Social Butterfly",
    description: "Use 'Phone a Friend' 10 times",
    icon: "📞",
    condition: (user) => user.stats.lifelinesUsed.phone_friend >= 10
  },

  crowd_pleaser: {
    id: "crowd_pleaser",
    name: "Crowd Pleaser",
    description: "Use 'Ask the Audience' 10 times",
    icon: "👥",
    condition: (user) => user.stats.lifelinesUsed.ask_audience >= 10
  },

  calculated: {
    id: "calculated",
    name: "Calculated",
    description: "Use '50:50' lifeline 10 times",
    icon: "🎯",
    condition: (user) => user.stats.lifelinesUsed.fifty_fifty >= 10
  },

  veteran: {
    id: "veteran",
    name: "Veteran",
    description: "Play 50 games",
    icon: "🎮",
    condition: (user) => user.stats.gamesPlayed >= 50
  }
};

/**
 * Check which achievements a user has unlocked
 * @param {Object} user - User object with stats
 * @returns {Array} - Array of unlocked achievement IDs
 */
export function checkAchievements(user) {
  if (!user || !user.stats) return [];

  const unlocked = [];

  Object.values(achievementDefinitions).forEach(achievement => {
    if (achievement.condition(user)) {
      unlocked.push(achievement.id);
    }
  });

  return unlocked;
}

/**
 * Get newly unlocked achievements since last check
 * @param {Object} user - User object with current achievements
 * @returns {Array} - Array of newly unlocked achievement objects
 */
export function getNewAchievements(user) {
  if (!user) return [];

  const currentAchievements = user.achievements || [];
  const allUnlocked = checkAchievements(user);

  const newIds = allUnlocked.filter(id => !currentAchievements.includes(id));

  return newIds.map(id => achievementDefinitions[id]);
}

/**
 * Update user's achievements list
 * @param {Object} user - User object to update
 * @returns {Array} - Array of newly unlocked achievements
 */
export function updateAchievements(user) {
  if (!user) return [];

  const newAchievements = getNewAchievements(user);

  // Add new achievement IDs to user's list
  newAchievements.forEach(achievement => {
    if (!user.achievements.includes(achievement.id)) {
      user.achievements.push(achievement.id);
    }
  });

  return newAchievements;
}

/**
 * Get achievement progress summary
 * @param {Object} user - User object
 * @returns {Object} - Progress summary
 */
export function getAchievementProgress(user) {
  if (!user) {
    return {
      total: Object.keys(achievementDefinitions).length,
      unlocked: 0,
      percentage: 0
    };
  }

  const total = Object.keys(achievementDefinitions).length;
  const unlocked = (user.achievements || []).length;
  const percentage = Math.round((unlocked / total) * 100);

  return { total, unlocked, percentage };
}
