// ============================================
// GAME CONFIGURATION
// ============================================

export const SHIP_TYPES = {
    scout: { name: 'Scout', icon: '🔭', color: '#00ffff', speed: 1.5, attack: 2, defense: 1, hitPoints: 3, cost: { energy: 10, minerals: 5, food: 0 }, baseBuildTime: 2, minBuildTime: 1 },
    colonizer: { name: 'Colonizer', icon: '🚀', color: '#ffff00', speed: 1.0, attack: 0, defense: 0, hitPoints: 0, cost: { energy: 30, minerals: 20, food: 20 }, baseBuildTime: 5, minBuildTime: 2 },
    frigate: { name: 'Frigate', icon: '⚔️', color: '#ff8800', speed: 1.2, attack: 4, defense: 3, hitPoints: 8, cost: { energy: 25, minerals: 30, food: 5 }, baseBuildTime: 4, minBuildTime: 2 },
    battleship: { name: 'Battleship', icon: '🛡️', color: '#ff0088', speed: 0.9, attack: 8, defense: 6, hitPoints: 15, cost: { energy: 50, minerals: 60, food: 10 }, baseBuildTime: 8, minBuildTime: 4 }
};

export const MAP_SIZES = {
    compact: { planets: 12, width: 1500, height: 1200 },
    standard: { planets: 20, width: 2500, height: 2000 },
    vast: { planets: 30, width: 4000, height: 3200 }
};

export const AI_CONFIG = {
    easy: {
        expansionPriority: 0.3,
        militaryPriority: 0.2,
        aggressiveness: 0.2,
        decisionDelay: 3,
        buildEfficiency: 0.6
    },
    medium: {
        expansionPriority: 0.5,
        militaryPriority: 0.5,
        aggressiveness: 0.5,
        decisionDelay: 2,
        buildEfficiency: 0.8
    },
    hard: {
        expansionPriority: 0.8,
        militaryPriority: 0.8,
        aggressiveness: 0.8,
        decisionDelay: 1,
        buildEfficiency: 1.0
    }
};
