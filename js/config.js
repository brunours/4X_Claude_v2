// ============================================
// GAME CONFIGURATION
// ============================================
//
// This module contains all core game configuration constants that define
// gameplay parameters, ship statistics, map sizes, and AI behavior settings.
//
// Version: 1.1.0 - Enhanced AI difficulty parameters with strategic intelligence,
//                  fleet composition, and defensive behaviors
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
        // Decision frequency
        expansionPriority: 0.3,
        militaryPriority: 0.2,
        aggressiveness: 0.2,
        decisionDelay: 3,
        buildEfficiency: 0.6,
        // Strategic intelligence (Proposal 2)
        targetingStrategy: 'random',     // Random valid target
        fleetCoordination: false,        // Ships move independently
        // Fleet composition (Proposal 3)
        attackForceRatio: 0.4,           // Only sends 40% of ships
        escortSize: 1,                   // Minimal colonizer escort
        overkillFactor: 0.5,             // Will attack even when weaker
        // Defensive behavior (Proposal 5)
        defenseThreshold: 0.0,           // Never holds ships back for defense
        homeDefenseRatio: 0.0,           // Sends everything
        counterAttackEnabled: false      // No retaliation logic
    },
    medium: {
        // Decision frequency
        expansionPriority: 0.5,
        militaryPriority: 0.5,
        aggressiveness: 0.5,
        decisionDelay: 2,
        buildEfficiency: 0.8,
        // Strategic intelligence (Proposal 2)
        targetingStrategy: 'nearest',    // Nearest neutral, weakest enemy
        fleetCoordination: true,         // Combine fleets from multiple planets
        // Fleet composition (Proposal 3)
        attackForceRatio: 0.6,           // Sends 60% of ships
        escortSize: 2,                   // Standard colonizer escort
        overkillFactor: 1.0,             // Attacks if equal or stronger
        // Defensive behavior (Proposal 5)
        defenseThreshold: 0.3,           // Defends if player has 30% more military
        homeDefenseRatio: 0.2,           // Keeps 20% at home
        counterAttackEnabled: false      // No retaliation logic
    },
    hard: {
        // Decision frequency
        expansionPriority: 0.8,
        militaryPriority: 0.8,
        aggressiveness: 0.8,
        decisionDelay: 1,
        buildEfficiency: 1.0,
        // Strategic intelligence (Proposal 2)
        targetingStrategy: 'optimal',    // Consider resource value + defense
        fleetCoordination: true,         // Combine fleets from multiple planets
        // Fleet composition (Proposal 3)
        attackForceRatio: 0.8,           // Sends most of fleet
        escortSize: 4,                   // Heavy colonizer escort
        overkillFactor: 1.5,             // Only attacks if 1.5x stronger
        // Defensive behavior (Proposal 5)
        defenseThreshold: 0.5,           // More cautious about defending
        homeDefenseRatio: 0.3,           // Always keeps 30% for defense
        counterAttackEnabled: true       // Retaliates after being attacked
    }
};
