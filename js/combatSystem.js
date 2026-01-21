// ============================================
// COMBAT SYSTEM
// ============================================

import { gameState, generateId } from './gameState.js';
import { SHIP_TYPES } from './config.js';
import { showNotification } from './uiManager.js';

// Ship strength values for combat calculations
const SHIP_STRENGTH = {
    scout: 1,
    frigate: 5,      // 4 frigates = 1 battleship
    battleship: 20
};

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
    // Ships return to source planet (simplified - just destroy them for now)
    // In a full implementation, they would return to origin
    const message = isDefending ?
        '🏃 Your forces have retreated!' :
        '🏃 You withdrew from the battle!';
    showNotification(message);
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

    // Calculate combat strength
    const attackerStrength = calculateFleetStrength(attackers);
    const defenderStrength = calculateFleetStrength(defenders);

    // Apply defender advantage (10% if planet is owned)
    const defenderBonus = planet.owner ? 1.10 : 1.0;
    const adjustedDefenderStrength = defenderStrength * defenderBonus;

    // Calculate win probability for attackers
    const totalStrength = attackerStrength + adjustedDefenderStrength;
    const attackerWinChance = totalStrength > 0 ? attackerStrength / totalStrength : 0.5;

    // Simulate combat
    const combatResult = simulateCombat(attackers, defenders, attackerWinChance);

    // Process casualties
    for (const ship of combatResult.destroyedAttackers) {
        destroyedAttackers.push({ type: ship.type, owner: ship.owner });
    }
    for (const ship of combatResult.destroyedDefenders) {
        destroyedDefenders.push({ type: ship.type, owner: ship.owner });
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

function calculateFleetStrength(ships) {
    let strength = 0;
    for (const ship of ships) {
        if (ship.type === 'colonizer') continue;

        const baseStrength = SHIP_STRENGTH[ship.type] || 1;
        const shipType = SHIP_TYPES[ship.type];
        const healthRatio = ship.hitPoints / shipType.maxHitPoints;

        strength += baseStrength * healthRatio;
    }
    return strength;
}

function simulateCombat(attackers, defenders, attackerWinChance) {
    const survivingAttackers = [];
    const survivingDefenders = [];
    const destroyedAttackers = [];
    const destroyedDefenders = [];

    // Determine winner
    const attackersWin = Math.random() < attackerWinChance;

    if (attackersWin) {
        // Attackers win - distribute damage proportionally
        const damageRatio = 1 - attackerWinChance; // How much damage attackers take
        distributeDamage(attackers, damageRatio, survivingAttackers, destroyedAttackers);

        // Defenders take heavy losses
        for (const ship of defenders) {
            if (ship.type !== 'colonizer') {
                destroyedDefenders.push(ship);
            }
        }
    } else {
        // Defenders win - distribute damage proportionally
        const damageRatio = attackerWinChance; // How much damage defenders take
        distributeDamage(defenders, damageRatio, survivingDefenders, destroyedDefenders);

        // Attackers take heavy losses
        for (const ship of attackers) {
            if (ship.type !== 'colonizer') {
                destroyedAttackers.push(ship);
            }
        }
    }

    return {
        survivingAttackers,
        survivingDefenders,
        destroyedAttackers,
        destroyedDefenders
    };
}

function distributeDamage(ships, damageRatio, survivors, destroyed) {
    const combatShips = ships.filter(s => s.type !== 'colonizer');
    const totalStrength = calculateFleetStrength(combatShips);
    const totalDamage = totalStrength * damageRatio * 2; // Multiply by 2 to make battles more costly

    let remainingDamage = totalDamage;

    // Sort by strength (weakest first to destroy weak ships first)
    const sorted = [...combatShips].sort((a, b) => {
        const aStr = SHIP_STRENGTH[a.type] || 1;
        const bStr = SHIP_STRENGTH[b.type] || 1;
        return aStr - bStr;
    });

    for (const ship of sorted) {
        if (remainingDamage <= 0) {
            survivors.push(ship);
            continue;
        }

        const shipType = SHIP_TYPES[ship.type];
        const damage = Math.min(ship.hitPoints, remainingDamage);

        ship.hitPoints -= damage;
        remainingDamage -= damage;

        if (ship.hitPoints <= 0) {
            destroyed.push(ship);
        } else {
            survivors.push(ship);
        }
    }

    // Add colonizers to survivors (they don't fight)
    for (const ship of ships) {
        if (ship.type === 'colonizer') {
            survivors.push(ship);
        }
    }
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
