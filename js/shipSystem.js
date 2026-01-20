// ============================================
// SHIP BUILDING & MOVEMENT
// ============================================

import { gameState, generateId } from './gameState.js';
import { SHIP_TYPES } from './config.js';

export function canAffordShip(owner, type) {
    const cost = SHIP_TYPES[type].cost;
    const player = gameState.players[owner];
    return player.energy >= cost.energy &&
           player.minerals >= cost.minerals &&
           player.food >= cost.food;
}

export function calculateBuildTime(type, population) {
    const ship = SHIP_TYPES[type];
    const popFactor = Math.max(0.5, 1 - (population / 200));
    return Math.max(ship.minBuildTime, Math.ceil(ship.baseBuildTime * popFactor));
}

export function buildShip(type) {
    if (!gameState.selectedPlanet || gameState.selectedPlanet.owner !== 'player') return;
    if (!canAffordShip('player', type)) return;

    const cost = SHIP_TYPES[type].cost;
    const player = gameState.players.player;

    player.energy -= cost.energy;
    player.minerals -= cost.minerals;
    player.food -= cost.food;

    const buildTime = calculateBuildTime(type, gameState.selectedPlanet.population);

    gameState.selectedPlanet.buildQueue.push({
        id: generateId(),
        type: type,
        turnsRemaining: buildTime
    });

    // Notification will be handled by uiManager
    return true;
}

export function cancelBuild(planetId, buildId) {
    const planet = gameState.planets.find(p => p.id == planetId);
    if (!planet) return;

    const idx = planet.buildQueue.findIndex(b => b.id === buildId);
    if (idx !== -1) {
        const item = planet.buildQueue[idx];
        const cost = SHIP_TYPES[item.type].cost;

        // Refund 50%
        gameState.players.player.energy += Math.floor(cost.energy * 0.5);
        gameState.players.player.minerals += Math.floor(cost.minerals * 0.5);
        gameState.players.player.food += Math.floor(cost.food * 0.5);

        planet.buildQueue.splice(idx, 1);
        return true;
    }
    return false;
}

export function sendShips(sourcePlanet, ships) {
    gameState.sourcePlanet = sourcePlanet;
    gameState.shipsToSend = ships;
    gameState.selectingDestination = true;

    document.getElementById('destinationHint').style.display = 'block';
    document.getElementById('gameContainer').classList.add('selecting-destination');
}

export function sendSelectedShips() {
    if (gameState.selectedShipIds.size === 0) return;

    const selectedPlanet = gameState.selectedPlanet;
    if (!selectedPlanet) return;

    // Filter ships that are both selected and owned by player
    const ships = selectedPlanet.ships.filter(s =>
        gameState.selectedShipIds.has(s.id) && s.owner === 'player'
    );

    if (ships.length > 0) {
        sendShips(selectedPlanet, ships);
    }
}

export function cancelDestinationSelection() {
    gameState.selectingDestination = false;
    gameState.sourcePlanet = null;
    gameState.shipsToSend = null;
    gameState.selectedShipIds.clear();

    document.getElementById('destinationHint').style.display = 'none';
    document.getElementById('gameContainer').classList.remove('selecting-destination');
}

export function completeShipSend(targetPlanet) {
    if (!gameState.sourcePlanet || !gameState.shipsToSend || !targetPlanet) return;
    if (targetPlanet === gameState.sourcePlanet) {
        cancelDestinationSelection();
        return;
    }

    const distance = Math.sqrt(
        (targetPlanet.x - gameState.sourcePlanet.x) ** 2 +
        (targetPlanet.y - gameState.sourcePlanet.y) ** 2
    );

    const avgSpeed = gameState.shipsToSend.reduce((sum, s) => sum + SHIP_TYPES[s.type].speed, 0) / gameState.shipsToSend.length;
    const turnsToTravel = Math.max(1, Math.ceil(distance / (avgSpeed * 100)));

    gameState.travelingShips.push({
        id: generateId(),
        ships: gameState.shipsToSend,
        fromPlanetId: gameState.sourcePlanet.id,
        targetPlanetId: targetPlanet.id,
        turnsRemaining: turnsToTravel,
        totalTurns: turnsToTravel,
        owner: 'player'
    });

    // Remove ships from source planet
    for (const ship of gameState.shipsToSend) {
        const idx = gameState.sourcePlanet.ships.findIndex(s => s.id === ship.id);
        if (idx !== -1) {
            gameState.sourcePlanet.ships.splice(idx, 1);
        }
    }

    cancelDestinationSelection();
}
