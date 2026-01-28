// ============================================
// GAME CONFIGURATION
// ============================================
//
// This module contains all core game configuration constants that define
// gameplay parameters, ship statistics, map sizes, and AI behavior settings.
//
// Version: 1.0.2 - Updated ship combat stats
//
// Ship Stats (v1.0.2):
// - Colonizer: 0 attack, 1 HP (non-combat)
// - Scout: 2 attack, 2 HP (fast reconnaissance)
// - Frigate: 7 attack, 5 HP (balanced warship)
// - Battleship: 15 attack, 10 HP (heavy warship)
// - All ships have 0 defense (defense stat removed)
//
// Exports:
// - SHIP_TYPES: Defines all ship types with their stats (cost, combat, speed, HP)
// - MAP_SIZES: Defines galaxy sizes (compact, standard, vast) with planet counts
// - AI_CONFIG: Defines AI difficulty levels and their behavioral parameters
//
// Used by: All game modules that need access to ship stats, map generation,
// or AI decision-making parameters

export const SHIP_TYPES = {
    scout: { name: 'Scout', icon: '🔭', color: '#00ffff', speed: 1.5, attack: 2, defense: 0, maxHitPoints: 2, cost: { energy: 10, minerals: 5, food: 0 }, baseBuildTime: 2, minBuildTime: 1 },
    colonizer: { name: 'Colonizer', icon: '🚀', color: '#ffff00', speed: 1.0, attack: 0, defense: 0, maxHitPoints: 1, cost: { energy: 30, minerals: 20, food: 20 }, baseBuildTime: 5, minBuildTime: 2 },
    frigate: { name: 'Frigate', icon: '⚔️', color: '#ff8800', speed: 1.2, attack: 7, defense: 0, maxHitPoints: 5, cost: { energy: 25, minerals: 30, food: 5 }, baseBuildTime: 4, minBuildTime: 2 },
    battleship: { name: 'Battleship', icon: '🛡️', color: '#ff0088', speed: 0.9, attack: 15, defense: 0, maxHitPoints: 10, cost: { energy: 50, minerals: 60, food: 10 }, baseBuildTime: 8, minBuildTime: 4 }
};

// Map sizes now use a base area for density calculations
// The actual width/height will be calculated dynamically to fit the viewport
export const MAP_SIZES = {
    compact: { planets: 12, baseArea: 1800000 },   // ~1500x1200
    standard: { planets: 20, baseArea: 5000000 },  // ~2500x2000
    vast: { planets: 30, baseArea: 12800000 }      // ~4000x3200
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
