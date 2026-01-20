// ============================================
// COMBAT SYSTEM
// ============================================

import { gameState, generateId } from './gameState.js';
import { SHIP_TYPES } from './config.js';
import { showNotification } from './uiManager.js';

export function resolveBattleChoice(choice) {
    if (!gameState.battlePending) return;

    const { attackingShips, planet, isDefending } = gameState.battlePending;

    let result = null;
    if (choice === 'fight') {
        result = resolveCombat(attackingShips, planet.ships, planet);
    } else if (choice === 'withdraw') {
        resolveWithdraw(attackingShips, planet);
    }

    document.getElementById('battleDialog').style.display = 'none';
    gameState.battlePending = null;

    // Show battle result notification
    if (result && choice === 'fight') {
        showBattleResult(result, isDefending);
    }
}

function showBattleResult(result, isDefending) {
    let message = '';

    if (isDefending) {
        // Player was defending
        if (result.victory) {
            // Attackers won (enemy won)
            message = `⚔️ DEFEAT! Enemy destroyed ${result.defendersDestroyed} of your ships. ${result.defendersSurvived} survived.`;
        } else {
            // Defenders won (player won)
            message = `🛡️ VICTORY! You destroyed ${result.attackersDestroyed} enemy ships! ${result.defendersSurvived} of yours survived.`;
        }
    } else {
        // Player was attacking
        if (result.victory) {
            message = `⚔️ VICTORY! You destroyed ${result.defendersDestroyed} enemy ships. ${result.attackersSurvived} of yours survived.`;
            if (result.conquered) {
                message += ' Planet conquered!';
            } else if (result.conquering) {
                message += ' Conquest in progress!';
            }
        } else {
            message = `⚔️ DEFEAT! Enemy destroyed ${result.attackersDestroyed} of your ships. ${result.attackersSurvived} survived.`;
        }
    }

    showNotification(message);
}

export function resolveWithdraw(attackingShips, planet) {
    // Ships return to source planet (simplified - just destroy them for now)
    // In a full implementation, they would return to origin
    return;
}

export function resolveCombat(attackingShips, defendingShips, planet) {
    let attackers = [...attackingShips];
    let defenders = [...defendingShips];

    const initialAttackerCount = attackers.length;
    const initialDefenderCount = defenders.length;

    const destroyedAttackers = [];
    const destroyedDefenders = [];

    while (attackers.length > 0 && defenders.length > 0) {
        // Attackers fire first
        for (const attacker of attackers) {
            if (defenders.length === 0) break;

            const shipType = SHIP_TYPES[attacker.type];
            const target = defenders[Math.floor(Math.random() * defenders.length)];
            const targetType = SHIP_TYPES[target.type];

            const damage = Math.max(1, shipType.attack - targetType.defense);
            target.hitPoints -= damage;

            if (target.hitPoints <= 0) {
                destroyedDefenders.push({ type: target.type, owner: target.owner });
                defenders = defenders.filter(s => s.id !== target.id);
            }
        }

        // Defenders fire back
        for (const defender of defenders) {
            if (attackers.length === 0) break;

            const shipType = SHIP_TYPES[defender.type];
            const target = attackers[Math.floor(Math.random() * attackers.length)];
            const targetType = SHIP_TYPES[target.type];

            const damage = Math.max(1, shipType.attack - targetType.defense);
            target.hitPoints -= damage;

            if (target.hitPoints <= 0) {
                destroyedAttackers.push({ type: target.type, owner: target.owner });
                attackers = attackers.filter(s => s.id !== target.id);
            }
        }
    }

    // Update planet ships with survivors
    planet.ships = defenders;

    const result = {
        victory: attackers.length > 0,
        attackersSurvived: attackers.length,
        defendersSurvived: defenders.length,
        attackersDestroyed: destroyedAttackers.length,
        defendersDestroyed: destroyedDefenders.length,
        destroyedAttackers,
        destroyedDefenders
    };

    // If attackers won and planet is not theirs, attempt conquest
    if (attackers.length > 0 && defenders.length === 0) {
        // Check for colonizer ships
        const hasColonizer = attackers.some(s => s.type === 'colonizer');

        if (planet.owner === null) {
            // Neutral planet - colonize immediately if colonizer present
            if (hasColonizer) {
                const attackerOwner = attackingShips[0].owner;
                planet.owner = attackerOwner;
                planet.population = 10;
                planet.ships = attackers.filter(s => s.type !== 'colonizer');

                result.conquered = true;
            }
        } else {
            // Enemy planet - needs time to conquer
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
                // No colonizer - just occupy
                planet.ships = attackers;
                result.occupied = true;
            }
        }
    }

    return result;
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
