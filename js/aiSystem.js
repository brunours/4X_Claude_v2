// ============================================
// AI SYSTEM
// ============================================
//
// Version: 1.1.0 - Enhanced AI difficulty scaling
//
// This module implements AI decision-making for the enemy player, including
// ship construction priorities, fleet movement strategies, and difficulty scaling.
//
// Core Responsibilities:
// - Process enemy turn actions (building ships, moving fleets)
// - Make strategic decisions based on difficulty settings (easy/medium/hard)
// - Balance expansion (colonizers) vs military (combat ships) based on priorities
// - Evaluate threats and opportunities for fleet movements
// - Target neutral planets for colonization or enemy planets for attack
// - Scale aggressiveness, build efficiency, and decision quality by difficulty
// - Calculate fleet compositions and military strength ratios
// - Coordinate multi-planet fleet attacks (medium/hard)
// - Implement defensive behaviors and home defense reserves
//
// AI Decision Factors:
// - expansionPriority: Likelihood of building colonizers vs military
// - militaryPriority: Focus on combat ship construction
// - aggressiveness: Frequency of attacks and fleet movements
// - buildEfficiency: Chance to make optimal build decisions each turn
// - targetingStrategy: 'random' | 'nearest' | 'optimal' - how AI picks targets
// - fleetCoordination: Whether AI coordinates attacks from multiple planets
// - attackForceRatio: Percentage of military ships sent on attacks
// - escortSize: Number of military ships escorting colonizers
// - overkillFactor: Required strength advantage before attacking
// - defenseThreshold: When to prioritize defense over offense
// - homeDefenseRatio: Percentage of ships kept for defense
// - counterAttackEnabled: Whether AI retaliates after being attacked
//
// Exports:
// - processAITurn(): Main AI turn processor called at end of each turn
//
// Used by: turnSystem (called during endTurn() after player actions)

import { gameState, generateId } from './gameState.js';
import { canAffordShip, buildShip, calculateBuildTime } from './shipSystem.js';
import { SHIP_TYPES, AI_CONFIG } from './config.js';

// Track recently attacked planets for counter-attack logic
let recentlyAttackedPlanets = [];

export function processAITurn() {
    const difficulty = AI_CONFIG[gameState.difficulty];
    const aiPlanets = gameState.planets.filter(p => p.owner === 'enemy');

    // AI builds ships
    for (const planet of aiPlanets) {
        if (Math.random() < difficulty.buildEfficiency) {
            aiDecideBuild(planet, difficulty);
        }
    }

    // AI moves ships - with fleet coordination if enabled
    if (difficulty.fleetCoordination) {
        aiCoordinatedMovement(aiPlanets, difficulty);
    } else {
        // Individual planet decisions (easy mode)
        for (const planet of aiPlanets) {
            if (planet.ships.length > 0 && Math.random() < difficulty.aggressiveness) {
                aiDecideShipMovement(planet, difficulty);
            }
        }
    }

    // Clear old attack tracking
    recentlyAttackedPlanets = recentlyAttackedPlanets.filter(
        entry => gameState.turn - entry.turn < 3
    );
}

// Called externally when a player attacks an AI planet (for counter-attack tracking)
export function recordPlayerAttack(planetId) {
    recentlyAttackedPlanets.push({ planetId, turn: gameState.turn });
}

function aiDecideBuild(planet, difficulty) {
    // Determine what to build based on priorities
    const militaryUnits = countEnemyMilitary('enemy');
    const playerMilitary = countPlayerMilitary('player');

    let buildType = null;

    // Prioritize colonizers for expansion
    if (Math.random() < difficulty.expansionPriority && canAfford('colonizer', 'enemy')) {
        buildType = 'colonizer';
    }
    // Build military if player is strong or we need defense
    else if (playerMilitary > militaryUnits * 0.7 && Math.random() < difficulty.militaryPriority) {
        if (canAfford('battleship', 'enemy')) {
            buildType = 'battleship';
        } else if (canAfford('frigate', 'enemy')) {
            buildType = 'frigate';
        } else if (canAfford('scout', 'enemy')) {
            buildType = 'scout';
        }
    }
    // Default to scouts
    else if (canAfford('scout', 'enemy')) {
        buildType = 'scout';
    }

    if (buildType) {
        const cost = SHIP_TYPES[buildType].cost;
        const ai = gameState.players.enemy;

        ai.energy -= cost.energy;
        ai.minerals -= cost.minerals;
        ai.food -= cost.food;

        const buildTime = calculateBuildTime(buildType, planet.population);

        planet.buildQueue.push({
            id: generateId(),
            type: buildType,
            turnsRemaining: buildTime
        });
    }
}

// Coordinated fleet movement for medium/hard AI
function aiCoordinatedMovement(aiPlanets, difficulty) {
    const neutralPlanets = gameState.planets.filter(p => p.owner === null);
    const playerPlanets = gameState.planets.filter(p => p.owner === 'player');

    // Check if we should counter-attack (hard mode only)
    if (difficulty.counterAttackEnabled && recentlyAttackedPlanets.length > 0) {
        const attackSource = findAttackSource();
        if (attackSource && Math.random() < difficulty.aggressiveness) {
            coordinateAttackOnTarget(aiPlanets, attackSource, difficulty);
            return;
        }
    }

    // Determine main strategy: attack or expand
    const shouldAttack = Math.random() < difficulty.aggressiveness && playerPlanets.length > 0;

    if (shouldAttack) {
        // Find best target based on targeting strategy
        const target = selectTarget(playerPlanets, aiPlanets, difficulty, 'attack');
        if (target) {
            coordinateAttackOnTarget(aiPlanets, target, difficulty);
        }
    } else if (neutralPlanets.length > 0) {
        // Expansion: send colonizers with escorts
        for (const planet of aiPlanets) {
            if (Math.random() < difficulty.aggressiveness) {
                aiDecideColonization(planet, neutralPlanets, difficulty);
            }
        }
    }
}

// Coordinate attack from multiple planets onto a single target
function coordinateAttackOnTarget(aiPlanets, target, difficulty) {
    const targetDefense = calculatePlanetStrength(target);
    let totalAttackPower = 0;
    const contributingPlanets = [];

    // Calculate how much force we can muster
    for (const planet of aiPlanets) {
        const availableMilitary = getAvailableMilitary(planet, difficulty);
        const strength = availableMilitary.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);
        if (strength > 0) {
            contributingPlanets.push({ planet, ships: availableMilitary, strength });
            totalAttackPower += strength;
        }
    }

    // Check if we have enough force (overkillFactor)
    const requiredStrength = targetDefense * difficulty.overkillFactor;
    if (totalAttackPower < requiredStrength) {
        // Not strong enough, don't attack
        return;
    }

    // Send ships from planets until we have enough
    let sentPower = 0;
    for (const { planet, ships } of contributingPlanets) {
        if (sentPower >= requiredStrength * 1.2) break; // Send a bit extra for safety

        const shipsToSend = ships.slice(0, Math.ceil(ships.length * difficulty.attackForceRatio));
        if (shipsToSend.length > 0) {
            sendFleet(planet, target, shipsToSend);
            sentPower += shipsToSend.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);
        }
    }
}

// Individual planet ship movement (for easy mode or colonization)
function aiDecideShipMovement(planet, difficulty) {
    const neutralPlanets = gameState.planets.filter(p => p.owner === null);
    const playerPlanets = gameState.planets.filter(p => p.owner === 'player');

    let target = null;

    // Aggressive: attack player planets
    if (Math.random() < difficulty.aggressiveness && playerPlanets.length > 0) {
        target = selectTarget(playerPlanets, [planet], difficulty, 'attack');
    }
    // Expansion: colonize neutral planets
    else if (neutralPlanets.length > 0) {
        target = selectTarget(neutralPlanets, [planet], difficulty, 'colonize');
    }

    if (target) {
        const shipsToSend = [];
        const hasColonizer = planet.ships.some(s => s.type === 'colonizer');

        if (hasColonizer && target.owner !== 'player') {
            // Send colonizer with escort based on difficulty
            const colonizer = planet.ships.find(s => s.type === 'colonizer');
            shipsToSend.push(colonizer);

            // Add military escort based on escortSize
            const military = planet.ships.filter(s => s.type !== 'colonizer').slice(0, difficulty.escortSize);
            shipsToSend.push(...military);
        } else {
            // Send military ships based on attackForceRatio
            const availableMilitary = getAvailableMilitary(planet, difficulty);

            // Check overkill factor before attacking
            const targetStrength = calculatePlanetStrength(target);
            const ourStrength = availableMilitary.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);

            if (ourStrength >= targetStrength * difficulty.overkillFactor) {
                const count = Math.ceil(availableMilitary.length * difficulty.attackForceRatio);
                shipsToSend.push(...availableMilitary.slice(0, count));
            }
        }

        if (shipsToSend.length > 0) {
            sendFleet(planet, target, shipsToSend);
        }
    }
}

// Handle colonization missions
function aiDecideColonization(planet, neutralPlanets, difficulty) {
    const hasColonizer = planet.ships.some(s => s.type === 'colonizer');
    if (!hasColonizer) return;

    const target = selectTarget(neutralPlanets, [planet], difficulty, 'colonize');
    if (!target) return;

    const shipsToSend = [];
    const colonizer = planet.ships.find(s => s.type === 'colonizer');
    shipsToSend.push(colonizer);

    // Add escort based on escortSize
    const military = planet.ships.filter(s => s.type !== 'colonizer' && SHIP_TYPES[s.type].attack > 0);
    const escortCount = Math.min(military.length, difficulty.escortSize);
    shipsToSend.push(...military.slice(0, escortCount));

    sendFleet(planet, target, shipsToSend);
}

// Select target based on difficulty's targeting strategy
function selectTarget(candidates, fromPlanets, difficulty, purpose) {
    if (candidates.length === 0) return null;

    switch (difficulty.targetingStrategy) {
        case 'random':
            // Easy mode: random target
            return candidates[Math.floor(Math.random() * candidates.length)];

        case 'nearest':
            // Medium mode: nearest for colonization, weakest for attack
            if (purpose === 'colonize') {
                return findNearestPlanet(fromPlanets[0], candidates);
            } else {
                return findWeakestPlanet(candidates);
            }

        case 'optimal':
            // Hard mode: consider value and strategic importance
            if (purpose === 'colonize') {
                return findBestColonizationTarget(fromPlanets[0], candidates);
            } else {
                return findOptimalAttackTarget(candidates, fromPlanets);
            }

        default:
            return candidates[0];
    }
}

// Hard mode: find best planet to colonize (high resources, good position)
function findBestColonizationTarget(fromPlanet, candidates) {
    let best = null;
    let bestScore = -Infinity;

    for (const planet of candidates) {
        const distance = Math.sqrt(
            (planet.x - fromPlanet.x) ** 2 +
            (planet.y - fromPlanet.y) ** 2
        );

        // Score based on resources and distance (closer is better)
        const resourceScore = (planet.resources?.energy || 5) +
                            (planet.resources?.minerals || 5) +
                            (planet.resources?.food || 5);
        const distancePenalty = distance / 100;
        const score = resourceScore - distancePenalty;

        if (score > bestScore) {
            bestScore = score;
            best = planet;
        }
    }

    return best || candidates[0];
}

// Hard mode: find optimal attack target (value vs defense ratio)
function findOptimalAttackTarget(candidates, fromPlanets) {
    let best = null;
    let bestScore = -Infinity;

    for (const planet of candidates) {
        const defense = calculatePlanetStrength(planet);
        const population = planet.population || 1;

        // Score: high population / low defense = good target
        const valueScore = population * 10;
        const defensePenalty = defense * 2;
        const score = valueScore - defensePenalty;

        if (score > bestScore) {
            bestScore = score;
            best = planet;
        }
    }

    return best || findWeakestPlanet(candidates);
}

// Find where the last attack on AI came from (for counter-attack)
function findAttackSource() {
    if (recentlyAttackedPlanets.length === 0) return null;

    const playerPlanets = gameState.planets.filter(p => p.owner === 'player');
    if (playerPlanets.length === 0) return null;

    // Find the player planet closest to the attacked AI planet
    const attackedPlanetId = recentlyAttackedPlanets[recentlyAttackedPlanets.length - 1].planetId;
    const attackedPlanet = gameState.planets.find(p => p.id === attackedPlanetId);

    if (!attackedPlanet) return null;

    return findNearestPlanet(attackedPlanet, playerPlanets);
}

// Get military ships available for attack (respecting homeDefenseRatio)
function getAvailableMilitary(planet, difficulty) {
    const military = planet.ships.filter(s => SHIP_TYPES[s.type].attack > 0);

    // Keep some ships for defense
    const keepForDefense = Math.floor(military.length * difficulty.homeDefenseRatio);
    const available = military.slice(0, military.length - keepForDefense);

    return available;
}

// Calculate total military strength of a planet
function calculatePlanetStrength(planet) {
    return planet.ships.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);
}

// Send a fleet from one planet to another
function sendFleet(fromPlanet, target, shipsToSend) {
    const distance = Math.sqrt(
        (target.x - fromPlanet.x) ** 2 +
        (target.y - fromPlanet.y) ** 2
    );

    const avgSpeed = shipsToSend.reduce((sum, s) => sum + SHIP_TYPES[s.type].speed, 0) / shipsToSend.length;
    const turnsToTravel = Math.max(1, Math.ceil(distance / (avgSpeed * 100)));

    gameState.travelingShips.push({
        id: generateId(),
        ships: shipsToSend,
        fromPlanetId: fromPlanet.id,
        targetPlanetId: target.id,
        turnsRemaining: turnsToTravel,
        totalTurns: turnsToTravel,
        owner: 'enemy'
    });

    // Remove ships from planet
    for (const ship of shipsToSend) {
        const idx = fromPlanet.ships.findIndex(s => s.id === ship.id);
        if (idx !== -1) {
            fromPlanet.ships.splice(idx, 1);
        }
    }
}

function canAfford(type, owner) {
    const cost = SHIP_TYPES[type].cost;
    const player = gameState.players[owner];
    return player.energy >= cost.energy &&
           player.minerals >= cost.minerals &&
           player.food >= cost.food;
}

function countPlayerMilitary(owner) {
    let count = 0;
    for (const planet of gameState.planets.filter(p => p.owner === owner)) {
        count += planet.ships.filter(s => SHIP_TYPES[s.type].attack > 0).length;
    }
    return count;
}

function countEnemyMilitary(owner) {
    return countPlayerMilitary(owner);
}

function findNearestPlanet(fromPlanet, candidates) {
    let nearest = null;
    let minDist = Infinity;

    for (const planet of candidates) {
        const dist = Math.sqrt(
            (planet.x - fromPlanet.x) ** 2 +
            (planet.y - fromPlanet.y) ** 2
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = planet;
        }
    }

    return nearest;
}

function findWeakestPlanet(candidates) {
    let weakest = null;
    let minStrength = Infinity;

    for (const planet of candidates) {
        const strength = planet.ships.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);
        if (strength < minStrength) {
            minStrength = strength;
            weakest = planet;
        }
    }

    return weakest || candidates[0];
}
