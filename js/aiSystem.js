// ============================================
// AI SYSTEM
// ============================================

import { gameState, generateId } from './gameState.js';
import { canAffordShip, buildShip, calculateBuildTime } from './shipSystem.js';
import { SHIP_TYPES, AI_CONFIG } from './config.js';

export function processAITurn() {
    const difficulty = AI_CONFIG[gameState.difficulty];
    const aiPlanets = gameState.planets.filter(p => p.owner === 'enemy');

    // AI builds ships
    for (const planet of aiPlanets) {
        if (Math.random() < difficulty.buildEfficiency) {
            aiDecideBuild(planet, difficulty);
        }
    }

    // AI moves ships
    for (const planet of aiPlanets) {
        if (planet.ships.length > 0 && Math.random() < difficulty.aggressiveness) {
            aiDecideShipMovement(planet, difficulty);
        }
    }
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

function aiDecideShipMovement(planet, difficulty) {
    // Find targets based on strategy
    const neutralPlanets = gameState.planets.filter(p => p.owner === null);
    const playerPlanets = gameState.planets.filter(p => p.owner === 'player');

    let target = null;

    // Aggressive: attack player planets
    if (Math.random() < difficulty.aggressiveness && playerPlanets.length > 0) {
        target = findWeakestPlanet(playerPlanets);
    }
    // Expansion: colonize neutral planets
    else if (neutralPlanets.length > 0) {
        target = findNearestPlanet(planet, neutralPlanets);
    }

    if (target) {
        // Send appropriate ships
        const shipsToSend = [];
        const hasColonizer = planet.ships.some(s => s.type === 'colonizer');

        if (hasColonizer && target.owner !== 'player') {
            // Send colonizer with escort
            const colonizer = planet.ships.find(s => s.type === 'colonizer');
            shipsToSend.push(colonizer);

            // Add military escort
            const military = planet.ships.filter(s => s.type !== 'colonizer').slice(0, 2);
            shipsToSend.push(...military);
        } else {
            // Send military ships
            const military = planet.ships.filter(s => SHIP_TYPES[s.type].attack > 0);
            const count = Math.min(military.length, Math.ceil(military.length * 0.6));
            shipsToSend.push(...military.slice(0, count));
        }

        if (shipsToSend.length > 0) {
            // Calculate travel time
            const distance = Math.sqrt(
                (target.x - planet.x) ** 2 +
                (target.y - planet.y) ** 2
            );

            const avgSpeed = shipsToSend.reduce((sum, s) => sum + SHIP_TYPES[s.type].speed, 0) / shipsToSend.length;
            const turnsToTravel = Math.max(1, Math.ceil(distance / (avgSpeed * 100)));

            gameState.travelingShips.push({
                id: generateId(),
                ships: shipsToSend,
                fromPlanetId: planet.id,
                targetPlanetId: target.id,
                turnsRemaining: turnsToTravel,
                totalTurns: turnsToTravel,
                owner: 'enemy'
            });

            // Remove ships from planet
            for (const ship of shipsToSend) {
                const idx = planet.ships.findIndex(s => s.id === ship.id);
                if (idx !== -1) {
                    planet.ships.splice(idx, 1);
                }
            }
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
