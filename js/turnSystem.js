// ============================================
// TURN SYSTEM
// ============================================
//
// This module orchestrates the end-turn sequence, processing all game events
// that occur each turn including builds, movement, healing, and resource collection.
//
// Core Responsibilities:
// - Coordinate turn progression and increment turn counter
// - Process ship build queues and complete construction
// - Move traveling ship groups and handle arrivals (combat or friendly landing)
// - Heal stationed ships at owned planets (20% HP per turn)
// - Collect resources from owned planets and apply population growth
// - Process conquest timers for planets being captured
// - Neutralize planets that lose all defending ships
// - Handle ship arrivals including colonization of neutral planets
// - Trigger combat when enemy ships encounter each other
// - Check for victory/defeat conditions
//
// Exports:
// - endTurn(): Main turn processing function called by "End Turn" button
// - processBuildQueues(): Completes ship construction
// - processTravelingShips(): Moves fleets and handles arrivals
// - healStationedShips(): Restores HP to ships at friendly planets
// - collectResources(): Gathers resources and grows populations
// - handleShipArrival(group): Processes fleet arrival events
// - processEmptyPlanets(): Neutralizes abandoned planets
// - checkGameEnd(): Evaluates win/loss conditions
//
// Used by: main.js and uiManager (End Turn button), called once per turn

import { gameState, generateId } from './gameState.js';
import { SHIP_TYPES } from './config.js';
import { resolveCombat, processPendingConquests } from './combatSystem.js';

export function endTurn() {
    gameState.turn++;

    processBuildQueues();
    processTravelingShips();
    healStationedShips();
    collectResources();
    processPendingConquests();
    processEmptyPlanets();

    // Process AI turn (will be imported from aiSystem)
    // processAITurn();

    // Check victory/defeat (will be handled by main or uiManager)
    // checkGameEnd();

    // UI updates will be handled by uiManager
}

export function processBuildQueues() {
    for (const planet of gameState.planets) {
        if (planet.buildQueue.length === 0) continue;
        if (!planet.owner) continue;

        const item = planet.buildQueue[0];
        item.turnsRemaining--;

        if (item.turnsRemaining <= 0) {
            const newShip = {
                id: generateId(),
                type: item.type,
                hitPoints: SHIP_TYPES[item.type].maxHitPoints,
                maxHitPoints: SHIP_TYPES[item.type].maxHitPoints,
                owner: planet.owner
            };

            planet.buildQueue.shift();

            // Track ship built
            gameState.players[planet.owner].shipsBuilt++;

            // Check if enemy ships are occupying
            const enemyOwner = planet.owner === 'player' ? 'enemy' : 'player';
            const enemyShips = planet.ships.filter(s => s.owner === enemyOwner);

            if (enemyShips.length > 0) {
                // New ship needs to fight occupiers - show battle dialog
                planet.ships.push(newShip);

                const conquestIdx = gameState.pendingConquests.findIndex(c => c.planetId === planet.id);
                if (conquestIdx !== -1) {
                    gameState.pendingConquests.splice(conquestIdx, 1);
                }

                // Set up battle dialog for player's planet being defended
                if (planet.owner === 'player') {
                    gameState.battlePending = {
                        attackingShips: enemyShips,
                        planet: planet,
                        isDefending: true
                    };
                } else {
                    // AI planet - auto-resolve
                    resolveCombat([newShip], enemyShips, planet);
                }
            } else {
                // No enemies, just add ship
                planet.ships.push(newShip);
            }
        }
    }
}

export function processTravelingShips() {
    for (let i = gameState.travelingShips.length - 1; i >= 0; i--) {
        const group = gameState.travelingShips[i];
        group.turnsRemaining--;

        if (group.turnsRemaining <= 0) {
            handleShipArrival(group);
            gameState.travelingShips.splice(i, 1);
        }
    }
}

export function healStationedShips() {
    const HEAL_RATE = 0.2;

    for (const planet of gameState.planets) {
        if (!planet.owner) continue; // Only heal at owned planets

        for (const ship of planet.ships) {
            // Only heal ships owned by the planet owner
            if (ship.owner !== planet.owner) continue;

            const shipType = SHIP_TYPES[ship.type];

            // Heal the ship
            if (ship.hitPoints < shipType.maxHitPoints) {
                ship.hitPoints = Math.min(
                    shipType.maxHitPoints,
                    ship.hitPoints + HEAL_RATE
                );
            }
        }
    }
}

export function handleShipArrival(shipGroup) {
    const targetPlanet = gameState.planets.find(p => p.id === shipGroup.targetPlanetId);
    if (!targetPlanet) return;

    // Check for colonizer on neutral planet FIRST (before any enemy checks)
    // Only colonize if no enemy ships are present
    if (!targetPlanet.owner) {
        const hasEnemyShips = targetPlanet.ships.some(s => s.owner !== shipGroup.owner);

        if (!hasEnemyShips) {
            const colonizer = shipGroup.ships.find(s => s.type === 'colonizer');
            if (colonizer) {
                targetPlanet.owner = shipGroup.owner;
                targetPlanet.population = 10;
                // Add all ships except colonizer
                targetPlanet.ships.push(...shipGroup.ships.filter(s => s.id !== colonizer.id));
                return;
            }
        }
    }

    const isHostile = targetPlanet.owner && targetPlanet.owner !== shipGroup.owner;
    const hasDefenders = targetPlanet.ships.some(s => s.owner !== shipGroup.owner);

    if (isHostile || hasDefenders) {
        // Battle scenario
        if (shipGroup.owner === 'player') {
            // Player ships attacking - show battle dialog
            gameState.battlePending = {
                attackingShips: shipGroup.ships,
                planet: targetPlanet,
                isDefending: false
            };
        } else {
            // Enemy ships attacking player planet - show battle dialog
            if (targetPlanet.owner === 'player' || targetPlanet.ships.some(s => s.owner === 'player')) {
                gameState.battlePending = {
                    attackingShips: shipGroup.ships,
                    planet: targetPlanet,
                    isDefending: true
                };
            } else {
                // AI vs AI - auto-resolve
                resolveCombat(shipGroup.ships, targetPlanet.ships, targetPlanet);
            }
        }
    } else {
        // Friendly arrival
        targetPlanet.ships.push(...shipGroup.ships);
    }
}

export function collectResources() {
    for (const owner of ['player', 'enemy']) {
        const ownedPlanets = gameState.planets.filter(p => p.owner === owner);

        let energy = 0, minerals = 0, food = 0;

        for (const planet of ownedPlanets) {
            energy += planet.resources.energy;
            minerals += planet.resources.minerals;
            food += planet.resources.food;

            // Population growth
            if (planet.population < planet.maxPopulation) {
                const foodBonus = planet.resources.food / 5;
                const growth = Math.floor(1 + foodBonus);
                planet.population = Math.min(planet.maxPopulation, planet.population + growth);
            }
        }

        gameState.players[owner].energy += energy;
        gameState.players[owner].minerals += minerals;
        gameState.players[owner].food += food;
    }
}

export function processEmptyPlanets() {
    // First, handle planets that were successfully attacked (immediate neutralization)
    if (gameState.attackedPlanets && gameState.attackedPlanets.length > 0) {
        for (const attackedInfo of gameState.attackedPlanets) {
            const planet = gameState.planets.find(p => p.id === attackedInfo.planetId);
            if (!planet) continue;

            // Check if original owner has any ships left on the planet
            const ownerShips = planet.ships.filter(s => s.owner === attackedInfo.previousOwner);
            if (ownerShips.length === 0) {
                // No defenders - planet becomes neutral
                planet.owner = null;
                planet.buildQueue = []; // Ensure build queue is cleared
            }
        }
        // Clear the attacked planets list after processing
        gameState.attackedPlanets = [];
    }

    // Then, check for planets that have become empty naturally
    for (const planet of gameState.planets) {
        // Skip if already neutral or has ships of the owner
        if (!planet.owner) continue;

        const ownerShips = planet.ships.filter(s => s.owner === planet.owner);
        if (ownerShips.length > 0) continue;

        // Check if ships are building that will complete next turn
        const buildingShips = planet.buildQueue.some(item => item.turnsRemaining === 1);
        if (buildingShips) continue;

        // Check if ships are arriving next turn
        const arrivingShips = gameState.travelingShips.some(group =>
            group.targetPlanetId === planet.id &&
            group.owner === planet.owner &&
            group.turnsRemaining === 1
        );
        if (arrivingShips) continue;

        // Check if the owner still has colonizers anywhere that could reclaim this planet
        const ownerHasColonizers = gameState.planets.some(p =>
            p.ships.some(s => s.owner === planet.owner && s.type === 'colonizer')
        ) || gameState.travelingShips.some(g =>
            g.owner === planet.owner && g.ships.some(s => s.type === 'colonizer')
        );

        // If owner has colonizers, keep the planet owned (they can reclaim it)
        // Otherwise, planet becomes neutral
        if (!ownerHasColonizers) {
            planet.owner = null;
        }
    }
}

export function checkGameEnd() {
    const playerPlanets = gameState.planets.filter(p => p.owner === 'player');
    const enemyPlanets = gameState.planets.filter(p => p.owner === 'enemy');

    // Check for colonizer ships (stationed or traveling)
    const hasPlayerColonizer = gameState.planets.some(p =>
        p.ships.some(s => s.owner === 'player' && s.type === 'colonizer')
    ) || gameState.travelingShips.some(g =>
        g.owner === 'player' && g.ships.some(s => s.type === 'colonizer')
    );

    const hasEnemyColonizer = gameState.planets.some(p =>
        p.ships.some(s => s.owner === 'enemy' && s.type === 'colonizer')
    ) || gameState.travelingShips.some(g =>
        g.owner === 'enemy' && g.ships.some(s => s.type === 'colonizer')
    );

    // Player loses if no planets AND no colonizers
    if (playerPlanets.length === 0 && !hasPlayerColonizer) {
        return { gameOver: true, victory: false };
    }

    // Enemy loses if no planets AND no colonizers
    if (enemyPlanets.length === 0 && !hasEnemyColonizer) {
        return { gameOver: true, victory: true };
    }

    return { gameOver: false };
}
