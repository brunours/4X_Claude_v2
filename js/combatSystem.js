// ============================================
// COMBAT SYSTEM
// ============================================
//
// This module handles all combat mechanics, including battle resolution,
// casualty calculations, conquest mechanics, and battle result displays.
//
// Version: 1.0.2 - Combat system overhaul with HP-based calculations
//
// Core Responsibilities:
// - Resolve combat using realistic HP-based round-by-round calculations
// - Handle player battle choices (fight or withdraw) with confirmation dialogs
// - Calculate fleet power based on ship attack values (not abstract strength)
// - Distribute damage across fleets weighted by HP (bigger ships = bigger targets)
// - Process planet conquest with colonizer mechanics (3-turn timer)
// - Track battle casualties and damaged ships for result displays
// - Handle special cases (colonizers auto-destroyed without escorts)
// - Manage planet ownership changes and neutralization after successful attacks
// - Implement tactical withdrawal with damage and destination selection
//
// Combat Mechanics (v1.0.2):
// - Ships fire in rounds until one side is eliminated
// - Each round has ±15% damage randomness
// - Defenders receive 10% HP bonus (not strength multiplier)
// - Equal strength battles cause significant damage to winners
// - Withdrawal incurs 30-40% of defender firepower as damage
//
// Exports:
// - resolveBattleChoice(choice): Processes player's fight/withdraw decision
// - resolveCombat(attackers, defenders, planet): Core combat resolution algorithm
// - showBattleResults(result, isDefending): Displays detailed battle outcome
// - resolveWithdraw(ships, planet, isDefending): Handles retreat with damage and destination
// - completeRetreat(planetId): Finalizes retreat to chosen friendly planet
// - processPendingConquests(): Updates conquest timers each turn
//
// Used by: turnSystem (ship arrivals, new ship construction), uiManager (battle dialogs),
//          inputHandler (retreat destination selection)

import { gameState, generateId } from './gameState.js';
import { SHIP_TYPES } from './config.js';
import { showNotification } from './uiManager.js';

// Combat system now uses actual attack power and hit points from SHIP_TYPES config
// No longer needs abstract strength values

export function resolveBattleChoice(choice) {
    if (!gameState.battlePending) return;

    const { attackingShips, planet, isDefending } = gameState.battlePending;

    document.getElementById('battleDialog').style.display = 'none';

    let result = null;
    if (choice === 'fight') {
        result = resolveCombat(attackingShips, planet.ships, planet);
        // Show battle results window
        showBattleResults(result, isDefending);
    } else if (choice === 'withdraw') {
        resolveWithdraw(attackingShips, planet, isDefending);
    }

    gameState.battlePending = null;
}

export function showBattleResults(result, isDefending) {
    const dialog = document.getElementById('battleResultsDialog');

    let title = '';
    let summary = '';

    if (isDefending) {
        if (result.victory) {
            // Attackers won (enemy won)
            title = '⚔️ DEFEAT!';
            summary = `Enemy forces have overwhelmed your defenses!`;
        } else {
            // Defenders won (player won)
            title = '🛡️ VICTORY!';
            summary = `You successfully repelled the attack!`;
        }
    } else {
        if (result.victory) {
            title = '⚔️ VICTORY!';
            summary = `Your forces prevailed!`;
            if (result.conquered) {
                summary += ' Planet conquered!';
            } else if (result.conquering) {
                summary += ' Conquest in progress!';
            }
        } else {
            title = '⚔️ DEFEAT!';
            summary = `Your attack was repelled!`;
        }
    }

    let casualties = '<div class="casualties-grid">';

    // Attacker casualties
    casualties += '<div class="casualty-side">';
    casualties += `<h4>${isDefending ? 'Enemy' : 'Your'} Forces</h4>`;
    casualties += `<div class="casualty-stat"><span>Ships Destroyed:</span> <span class="stat-value">${result.attackersDestroyed}</span></div>`;
    casualties += `<div class="casualty-stat"><span>Ships Survived:</span> <span class="stat-value">${result.attackersSurvived}</span></div>`;

    if (result.damagedAttackers.length > 0) {
        casualties += '<div class="damaged-ships"><strong>Damaged Ships:</strong>';
        for (const ship of result.damagedAttackers) {
            const shipType = SHIP_TYPES[ship.type];
            const healthPercent = Math.round((ship.hitPoints / shipType.maxHitPoints) * 100);
            casualties += `<div>${shipType.icon} ${shipType.name} (${healthPercent}% HP)</div>`;
        }
        casualties += '</div>';
    }
    casualties += '</div>';

    // Defender casualties
    casualties += '<div class="casualty-side">';
    casualties += `<h4>${isDefending ? 'Your' : 'Enemy'} Forces</h4>`;
    casualties += `<div class="casualty-stat"><span>Ships Destroyed:</span> <span class="stat-value">${result.defendersDestroyed}</span></div>`;
    casualties += `<div class="casualty-stat"><span>Ships Survived:</span> <span class="stat-value">${result.defendersSurvived}</span></div>`;

    if (result.damagedDefenders.length > 0) {
        casualties += '<div class="damaged-ships"><strong>Damaged Ships:</strong>';
        for (const ship of result.damagedDefenders) {
            const shipType = SHIP_TYPES[ship.type];
            const healthPercent = Math.round((ship.hitPoints / shipType.maxHitPoints) * 100);
            casualties += `<div>${shipType.icon} ${shipType.name} (${healthPercent}% HP)</div>`;
        }
        casualties += '</div>';
    }
    casualties += '</div>';

    casualties += '</div>';

    dialog.innerHTML = `
        <h2>${title}</h2>
        <p class="battle-summary">${summary}</p>
        ${casualties}
        <button class="battle-results-btn" onclick="window.closeBattleResults()">CONTINUE</button>
    `;

    dialog.style.display = 'block';
}

export function resolveWithdraw(attackingShips, planet, isDefending) {
    // Calculate withdrawal damage (defenders get one free attack)
    const defenders = planet.ships;
    const defenderPower = calculateFleetPower(defenders);

    // Withdrawing forces take 30-40% of defender firepower as damage
    const withdrawalDamage = defenderPower * (0.30 + Math.random() * 0.10);

    // Create a copy of attacking ships to apply damage
    let retreatingShips = attackingShips.map(s => ({...s}));
    const destroyedDuringRetreat = [];

    // Apply withdrawal damage
    applyDamageToFleet(retreatingShips, withdrawalDamage, destroyedDuringRetreat);
    retreatingShips = retreatingShips.filter(s => s.hitPoints > 0);

    if (isDefending) {
        // Defending forces retreat - find friendly planets to retreat to
        const friendlyPlanets = gameState.planets.filter(p =>
            p.owner === 'player' && p.id !== planet.id
        );

        if (friendlyPlanets.length === 0) {
            // No retreat option - ships are destroyed
            showNotification('🏃 No friendly planets to retreat to! Ships destroyed!');
            planet.ships = planet.ships.filter(s => s.owner !== 'player');
        } else if (friendlyPlanets.length === 1) {
            // Auto-retreat to only friendly planet
            const retreatPlanet = friendlyPlanets[0];
            planet.ships = planet.ships.filter(s => s.owner !== 'player');
            retreatPlanet.ships.push(...retreatingShips);

            const casualties = destroyedDuringRetreat.length;
            showNotification(`🏃 Retreated to ${retreatPlanet.name}! ${casualties} ships lost during retreat.`);
        } else {
            // Show planet selection dialog
            gameState.retreatingShips = retreatingShips;
            gameState.retreatSource = planet;
            gameState.retreatCasualties = destroyedDuringRetreat.length;
            showRetreatDialog(friendlyPlanets, destroyedDuringRetreat.length);
        }
    } else {
        // Attacking forces retreat - they came from somewhere
        const battlePending = gameState.battlePending;
        if (battlePending && battlePending.retreatOptions) {
            const friendlyPlanets = battlePending.retreatOptions;

            if (friendlyPlanets.length === 1) {
                // Auto-retreat to origin
                const retreatPlanet = friendlyPlanets[0];
                retreatPlanet.ships.push(...retreatingShips);

                const casualties = destroyedDuringRetreat.length;
                showNotification(`🏃 Withdrew to ${retreatPlanet.name}! ${casualties} ships lost during retreat.`);
            } else {
                // Show planet selection dialog
                gameState.retreatingShips = retreatingShips;
                gameState.retreatCasualties = destroyedDuringRetreat.length;
                showRetreatDialog(friendlyPlanets, destroyedDuringRetreat.length);
            }
        } else {
            // Fallback - ships just disappear with message
            const casualties = destroyedDuringRetreat.length;
            showNotification(`🏃 Withdrew from battle! ${casualties} ships lost during retreat.`);
        }
    }
}

function showRetreatDialog(friendlyPlanets, casualties) {
    const dialog = document.getElementById('battleDialog');

    let planetsHtml = '';
    for (const planet of friendlyPlanets) {
        planetsHtml += `
            <button class="battle-btn" style="width: 100%; margin: 5px 0;"
                onclick="window.completeRetreat('${planet.id}')">
                Retreat to ${planet.name}
            </button>
        `;
    }

    dialog.innerHTML = `
        <h2>🏃 SELECT RETREAT DESTINATION</h2>
        <div class="battle-info">
            <p>${casualties} ships were destroyed during the retreat.</p>
            <p>Choose a friendly planet to retreat to:</p>
        </div>
        <div class="battle-buttons" style="flex-direction: column;">
            ${planetsHtml}
        </div>
    `;

    dialog.style.display = 'block';
}

export function resolveCombat(attackingShips, defendingShips, planet) {
    let attackers = [...attackingShips];
    let defenders = [...defendingShips];

    const destroyedAttackers = [];
    const destroyedDefenders = [];
    const damagedAttackers = [];
    const damagedDefenders = [];

    // Special case: Colonizers are auto-destroyed if facing enemies without escort
    const attackerColonizers = attackers.filter(s => s.type === 'colonizer');
    const attackerEscorts = attackers.filter(s => s.type !== 'colonizer');

    if (attackerColonizers.length > 0 && attackerEscorts.length === 0 && defenders.length > 0) {
        for (const colonizer of attackerColonizers) {
            destroyedAttackers.push({ type: colonizer.type, owner: colonizer.owner });
        }
        attackers = attackers.filter(s => s.type !== 'colonizer');
    }

    const defenderColonizers = defenders.filter(s => s.type === 'colonizer');
    const defenderEscorts = defenders.filter(s => s.type !== 'colonizer');

    if (defenderColonizers.length > 0 && defenderEscorts.length === 0 && attackers.length > 0) {
        for (const colonizer of defenderColonizers) {
            destroyedDefenders.push({ type: colonizer.type, owner: colonizer.owner });
        }
        defenders = defenders.filter(s => s.type !== 'colonizer');
    }

    // Apply defender advantage (10% extra HP if planet is owned)
    if (planet.owner) {
        for (const ship of defenders) {
            if (ship.type !== 'colonizer') {
                const shipType = SHIP_TYPES[ship.type];
                ship.hitPoints = Math.min(ship.hitPoints * 1.1, shipType.maxHitPoints);
            }
        }
    }

    // Simulate combat (no longer needs win chance parameter)
    const combatResult = simulateCombat(attackers, defenders, null);

    // Process casualties
    for (const ship of combatResult.destroyedAttackers) {
        destroyedAttackers.push({ type: ship.type, owner: ship.owner });
        // Track enemy ships destroyed (defenders destroyed attackers)
        const defenderOwner = defendingShips[0]?.owner;
        if (defenderOwner && gameState.players[defenderOwner]) {
            gameState.players[defenderOwner].enemyShipsDestroyed++;
        }
    }
    for (const ship of combatResult.destroyedDefenders) {
        destroyedDefenders.push({ type: ship.type, owner: ship.owner });
        // Track enemy ships destroyed (attackers destroyed defenders)
        const attackerOwner = attackingShips[0]?.owner;
        if (attackerOwner && gameState.players[attackerOwner]) {
            gameState.players[attackerOwner].enemyShipsDestroyed++;
        }
    }

    // Track damaged ships
    for (const ship of combatResult.survivingAttackers) {
        const shipType = SHIP_TYPES[ship.type];
        if (ship.hitPoints < shipType.maxHitPoints) {
            damagedAttackers.push({ type: ship.type, owner: ship.owner, hitPoints: ship.hitPoints });
        }
    }
    for (const ship of combatResult.survivingDefenders) {
        const shipType = SHIP_TYPES[ship.type];
        if (ship.hitPoints < shipType.maxHitPoints) {
            damagedDefenders.push({ type: ship.type, owner: ship.owner, hitPoints: ship.hitPoints });
        }
    }

    attackers = combatResult.survivingAttackers;
    defenders = combatResult.survivingDefenders;

    // Update planet ships with survivors
    planet.ships = defenders;

    const result = {
        victory: attackers.length > 0,
        attackersSurvived: attackers.length,
        defendersSurvived: defenders.length,
        attackersDestroyed: destroyedAttackers.length,
        defendersDestroyed: destroyedDefenders.length,
        destroyedAttackers,
        destroyedDefenders,
        damagedAttackers,
        damagedDefenders
    };

    // If attackers won and planet is not theirs, attempt conquest
    if (attackers.length > 0 && defenders.length === 0) {
        const hasColonizer = attackers.some(s => s.type === 'colonizer');
        const previousOwner = planet.owner;

        if (planet.owner === null) {
            // Neutral planet - colonize immediately if colonizer present
            if (hasColonizer) {
                const attackerOwner = attackingShips[0].owner;
                planet.owner = attackerOwner;
                planet.population = 10;
                planet.ships = attackers.filter(s => s.type !== 'colonizer');

                result.conquered = true;
            } else {
                planet.ships = attackers;
            }
        } else {
            // Enemy planet - shipyard is destroyed by successful attack
            // Cancel all build queue items
            planet.buildQueue = [];

            if (hasColonizer) {
                const attackerOwner = attackingShips[0].owner;
                planet.ships = attackers;

                // Start conquest timer
                gameState.pendingConquests.push({
                    planetId: planet.id,
                    newOwner: attackerOwner,
                    turnsRemaining: 3
                });

                result.conquering = true;
            } else {
                // No colonizer - planet will become neutral
                // Mark for neutralization (will happen in processEmptyPlanets)
                planet.ships = attackers;
                result.occupied = true;

                // Mark planet as attacked to trigger immediate neutralization
                if (!gameState.attackedPlanets) {
                    gameState.attackedPlanets = [];
                }
                gameState.attackedPlanets.push({
                    planetId: planet.id,
                    previousOwner: previousOwner
                });
            }
        }
    } else if (attackers.length > 0) {
        // Battle ended but both sides have survivors - attackers stay
        planet.ships = [...defenders, ...attackers];
    }

    return result;
}

function calculateFleetPower(ships) {
    // Calculate total firepower of a fleet
    let power = 0;
    for (const ship of ships) {
        if (ship.type === 'colonizer') continue;
        const shipType = SHIP_TYPES[ship.type];
        power += shipType.attack;
    }
    return power;
}

function simulateCombat(attackers, defenders, attackerWinChance) {
    const survivingAttackers = [];
    const survivingDefenders = [];
    const destroyedAttackers = [];
    const destroyedDefenders = [];

    // Make copies to avoid modifying originals during simulation
    let attackerShips = attackers.filter(s => s.type !== 'colonizer').map(s => ({...s}));
    let defenderShips = defenders.filter(s => s.type !== 'colonizer').map(s => ({...s}));

    // Combat rounds until one side is eliminated
    let round = 0;
    const maxRounds = 50; // Prevent infinite loops

    while (attackerShips.length > 0 && defenderShips.length > 0 && round < maxRounds) {
        round++;

        // Attackers fire at defenders
        const attackerDamage = calculateFleetPower(attackerShips);
        // Add small randomness (±15%)
        const actualAttackerDamage = attackerDamage * (0.85 + Math.random() * 0.3);
        applyDamageToFleet(defenderShips, actualAttackerDamage, destroyedDefenders);

        // Remove destroyed ships from defenders
        defenderShips = defenderShips.filter(s => s.hitPoints > 0);

        if (defenderShips.length === 0) break;

        // Defenders fire at attackers
        const defenderDamage = calculateFleetPower(defenderShips);
        // Add small randomness (±15%)
        const actualDefenderDamage = defenderDamage * (0.85 + Math.random() * 0.3);
        applyDamageToFleet(attackerShips, actualDefenderDamage, destroyedAttackers);

        // Remove destroyed ships from attackers
        attackerShips = attackerShips.filter(s => s.hitPoints > 0);
    }

    // Update survivors
    for (const ship of attackerShips) {
        survivingAttackers.push(ship);
    }
    for (const ship of defenderShips) {
        survivingDefenders.push(ship);
    }

    // Add colonizers to survivors (they don't participate in combat)
    for (const ship of attackers) {
        if (ship.type === 'colonizer') {
            survivingAttackers.push(ship);
        }
    }
    for (const ship of defenders) {
        if (ship.type === 'colonizer') {
            survivingDefenders.push(ship);
        }
    }

    return {
        survivingAttackers,
        survivingDefenders,
        destroyedAttackers,
        destroyedDefenders
    };
}

function applyDamageToFleet(ships, totalDamage, destroyedList) {
    // Distribute damage across fleet
    // Damage is distributed randomly but weighted by HP (weaker ships more likely to be hit)
    let remainingDamage = totalDamage;

    while (remainingDamage > 0 && ships.length > 0) {
        // Pick a random ship weighted by HP (ships with more HP are bigger targets)
        const totalHP = ships.reduce((sum, s) => sum + s.hitPoints, 0);
        let roll = Math.random() * totalHP;
        let targetIndex = 0;

        for (let i = 0; i < ships.length; i++) {
            roll -= ships[i].hitPoints;
            if (roll <= 0) {
                targetIndex = i;
                break;
            }
        }

        const target = ships[targetIndex];
        const damage = Math.min(remainingDamage, target.hitPoints);
        target.hitPoints -= damage;
        remainingDamage -= damage;

        if (target.hitPoints <= 0) {
            destroyedList.push({type: target.type, owner: target.owner});
            ships.splice(targetIndex, 1);
        }
    }
}

export function completeRetreat(planetId) {
    const retreatPlanet = gameState.planets.find(p => p.id === planetId);
    if (!retreatPlanet || !gameState.retreatingShips) return;

    // Move retreating ships to chosen planet
    if (gameState.retreatSource) {
        // Remove from source planet if defending
        gameState.retreatSource.ships = gameState.retreatSource.ships.filter(s => s.owner !== 'player');
    }

    retreatPlanet.ships.push(...gameState.retreatingShips);

    // Show notification
    showNotification(`🏃 Retreated to ${retreatPlanet.name}! ${gameState.retreatCasualties} ships lost during retreat.`);

    // Clean up
    gameState.retreatingShips = null;
    gameState.retreatSource = null;
    gameState.retreatCasualties = 0;

    // Close dialog
    document.getElementById('battleDialog').style.display = 'none';
}

export function processPendingConquests() {
    for (let i = gameState.pendingConquests.length - 1; i >= 0; i--) {
        const conquest = gameState.pendingConquests[i];
        const planet = gameState.planets.find(p => p.id === conquest.planetId);

        if (!planet) {
            gameState.pendingConquests.splice(i, 1);
            continue;
        }

        // Check if conquerors are still present
        const conquerorShips = planet.ships.filter(s => s.owner === conquest.newOwner);
        if (conquerorShips.length === 0) {
            gameState.pendingConquests.splice(i, 1);
            continue;
        }

        conquest.turnsRemaining--;

        if (conquest.turnsRemaining <= 0) {
            // Conquest complete!
            planet.owner = conquest.newOwner;
            planet.population = Math.max(10, Math.floor(planet.population * 0.3));

            gameState.pendingConquests.splice(i, 1);
        }
    }
}
