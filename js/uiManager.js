// ============================================
// UI MANAGER
// ============================================
//
// This module manages all UI panels, displays, and user interactions including
// planet details, fleet management, shipyard controls, and notifications.
//
// Core Responsibilities:
// - Update resource displays (energy, minerals, food, score, turn counter)
// - Manage unified planet panel (stats, ownership, production)
// - Display fleet information (stationed ships, ships in transit)
// - Handle shipyard UI (build options, build queue visualization)
// - Enable ship selection with visual feedback (checkboxes, highlighting)
// - Show/hide panels based on planet selection and ownership
// - Display battle dialogs with combat information
// - Show battle results with detailed casualties
// - Generate notifications for game events
// - Manage tab switching (stationed vs transit fleets)
// - Handle game over screen (victory/defeat)
//
// Exports:
// - updateDisplay(): Refreshes resource and score displays
// - updatePlanetPanel(), updateFleetPanel(), updateShipyardPanel(): Panel updates
// - selectPlanet(planet): Opens panels for selected planet
// - showNotification(message): Displays temporary notification
// - showBattleDialog(), showGameOver(): Modal dialogs
// - closePlanetPanel(), switchFleetTab(): Panel controls
//
// Used by: inputHandler (planet selection), turnSystem (auto-updates), main.js

import { gameState, calculateScore } from './gameState.js';
import { buildShip, cancelBuild } from './shipSystem.js';
import { SHIP_TYPES } from './config.js';

// Export functions used by other modules and HTML onclick handlers
export function closePlanetPanel() {
    gameState.selectedPlanet = null;
    hideAllPanels();
}

export function updateDisplay() {
    // Update resource display
    document.getElementById('energyCount').textContent = Math.floor(gameState.players.player.energy);
    document.getElementById('mineralsCount').textContent = Math.floor(gameState.players.player.minerals);
    document.getElementById('foodCount').textContent = Math.floor(gameState.players.player.food);
    document.getElementById('turnCount').textContent = gameState.turn;

    // Update score
    const score = calculateScore('player');
    document.getElementById('scoreCount').textContent = score;
}

export function updatePlanetPanel(planet) {
    const panel = document.getElementById('planetContent');
    const planetName = document.getElementById('selectedPlanetName');
    if (!planet) return;

    // Update planet name in header
    planetName.textContent = planet.name;

    const content = `
        <div class="planet-stats">
            <div class="stat">
                <div class="stat-label">Owner</div>
                <div>${planet.owner || 'Neutral'}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Population</div>
                <div>${planet.population}/${planet.maxPopulation}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Ships</div>
                <div>${planet.ships.length}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Production</div>
                <div>⚡${planet.resources.energy} ⛏️${planet.resources.minerals} 🌿${planet.resources.food}</div>
            </div>
        </div>
    `;

    panel.innerHTML = content;
}

export function updateFleetPanel() {
    const panel = document.getElementById('fleetContent');
    const tab = gameState.fleetTab;

    let content = '';

    if (tab === 'stationed') {
        // Show ships grouped by type with click-to-select
        if (gameState.selectedPlanet && gameState.selectedPlanet.ships.length > 0) {
            // Separate player ships and enemy ships
            const playerShips = gameState.selectedPlanet.ships.filter(s => s.owner === 'player');
            const enemyShips = gameState.selectedPlanet.ships.filter(s => s.owner !== 'player');

            // Group player ships by type
            const shipGroups = {};
            for (const ship of playerShips) {
                if (!shipGroups[ship.type]) {
                    shipGroups[ship.type] = { ships: [], selectedCount: 0 };
                }
                shipGroups[ship.type].ships.push(ship);
                if (gameState.selectedShipIds.has(ship.id)) {
                    shipGroups[ship.type].selectedCount++;
                }
            }

            // Show player ship groups (click to select/deselect)
            for (const [type, group] of Object.entries(shipGroups)) {
                const shipType = SHIP_TYPES[type];
                const totalCount = group.ships.length;
                const selectedCount = group.selectedCount;
                const availableCount = totalCount - selectedCount;
                const hasSelection = selectedCount > 0;

                content += `
                    <div class="ship-group ${hasSelection ? 'has-selection' : ''}" onclick="window.toggleShipTypeSelection('${type}')">
                        <div class="ship-group-icon">${shipType.icon}</div>
                        <div class="ship-group-info">
                            <span class="ship-group-name">${shipType.name}</span>
                            <span class="ship-group-counts">
                                <span class="available-count">${availableCount}</span>
                                ${selectedCount > 0 ? `<span class="selected-count">+${selectedCount}</span>` : ''}
                            </span>
                        </div>
                    </div>
                `;
            }

            // Show enemy ships grouped (not selectable)
            if (enemyShips.length > 0) {
                const enemyGroups = {};
                for (const ship of enemyShips) {
                    if (!enemyGroups[ship.type]) {
                        enemyGroups[ship.type] = 0;
                    }
                    enemyGroups[ship.type]++;
                }

                for (const [type, count] of Object.entries(enemyGroups)) {
                    const shipType = SHIP_TYPES[type];
                    content += `
                        <div class="ship-group enemy">
                            <div class="ship-group-icon">${shipType.icon}</div>
                            <div class="ship-group-info">
                                <span class="ship-group-name">${shipType.name}</span>
                                <span class="ship-group-counts">
                                    <span class="enemy-count">${count}</span>
                                </span>
                            </div>
                        </div>
                    `;
                }
            }

            // Add Send button if ships are selected
            if (gameState.selectedShipIds.size > 0) {
                content += `
                    <button class="send-ships-btn" onclick="window.sendSelectedShips()" style="grid-column: 1 / -1; margin-top: 10px; padding: 8px; background: linear-gradient(135deg, #0f8, #0c6); border: none; border-radius: 6px; color: #000; font-family: 'Orbitron', monospace; font-weight: 600; cursor: pointer;">
                        SEND ${gameState.selectedShipIds.size} SHIP${gameState.selectedShipIds.size > 1 ? 'S' : ''}
                    </button>
                `;
            }
        }
    } else if (tab === 'transit') {
        const playerShips = gameState.travelingShips.filter(g => g.owner === 'player');

        for (const group of playerShips) {
            const fromPlanet = gameState.planets.find(p => p.id === group.fromPlanetId);
            const toPlanet = gameState.planets.find(p => p.id === group.targetPlanetId);

            // Show route header spanning both columns
            content += `
                <div style="grid-column: 1 / -1; font-size:0.85rem; margin-bottom: 4px;">
                    <div style="color:#0af;">${fromPlanet?.name || '?'} → ${toPlanet?.name || '?'}</div>
                    <div style="font-size:0.75rem;color:#888;">ETA: ${group.turnsRemaining} turns</div>
                </div>
            `;

            const shipCounts = {};
            for (const ship of group.ships) {
                shipCounts[ship.type] = (shipCounts[ship.type] || 0) + 1;
            }

            for (const [type, count] of Object.entries(shipCounts)) {
                const shipType = SHIP_TYPES[type];
                content += `
                    <div class="ship-group">
                        <div class="ship-group-icon">${shipType.icon}</div>
                        <div class="ship-group-info">
                            <span class="ship-group-name">${shipType.name}</span>
                            <span class="ship-group-counts">
                                <span class="available-count">${count}</span>
                            </span>
                        </div>
                    </div>
                `;
            }
        }
    }

    panel.innerHTML = content || '<p style="color:#888;text-align:center;padding:20px;grid-column: 1 / -1;">No ships</p>';
}

export function updateShipyardPanel() {
    const planet = gameState.selectedPlanet;
    if (!planet || planet.owner !== 'player') return;

    const panel = document.getElementById('shipyardContent');

    // Build options section (always visible)
    let content = '<div class="build-options-section"><h4>Build Ships</h4><div class="build-options">';

    for (const [type, shipType] of Object.entries(SHIP_TYPES)) {
        const cost = shipType.cost;
        const canAfford =
            gameState.players.player.energy >= cost.energy &&
            gameState.players.player.minerals >= cost.minerals &&
            gameState.players.player.food >= cost.food;

        content += `
            <button class="build-btn" ${canAfford ? '' : 'disabled'}
                onclick="window.buildShipType('${type}')">
                <div>
                    <span>${shipType.icon}</span>
                    <span>${shipType.name}</span>
                </div>
                <div class="build-cost">
                    ⚡${cost.energy} ⛏️${cost.minerals} 🌿${cost.food}
                </div>
            </button>
        `;
    }

    content += '</div></div>';

    // Build queue section (separate from build options)
    if (planet.buildQueue.length > 0) {
        content += '<div class="build-queue"><h4>Queue (' + planet.buildQueue.length + ')</h4><div class="queue-grid">';

        let cumulativeTurns = 0;
        for (const item of planet.buildQueue) {
            const shipType = SHIP_TYPES[item.type];
            cumulativeTurns += item.turnsRemaining;
            content += `
                <div class="queue-item">
                    <span>${shipType.icon} ${cumulativeTurns}t</span>
                    <button class="queue-cancel" onclick="window.cancelBuildItem('${planet.id}', '${item.id}')">&times;</button>
                </div>
            `;
        }

        content += '</div></div>';
    }

    panel.innerHTML = content;
}

export function selectPlanet(planet) {
    gameState.selectedPlanet = planet;

    if (planet) {
        showAllPanels();
    } else {
        hideAllPanels();
    }
}

export function showAllPanels() {
    const unifiedPanel = document.getElementById('unifiedPanel');

    if (gameState.selectedPlanet) {
        updatePlanetPanel(gameState.selectedPlanet);
        updateFleetPanel();

        // Show/hide shipyard section based on ownership
        const shipyardSection = document.querySelector('.shipyard-section');
        if (gameState.selectedPlanet.owner === 'player') {
            updateShipyardPanel();
            shipyardSection.style.display = 'block';
        } else {
            shipyardSection.style.display = 'none';
        }

        unifiedPanel.style.display = 'block';
    }
}

export function hideAllPanels() {
    document.getElementById('unifiedPanel').style.display = 'none';
}

export function switchFleetTab(tab) {
    gameState.fleetTab = tab;

    document.querySelectorAll('.fleet-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    updateFleetPanel();
}

export function showNotification(message) {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

export function showBattleDialog(attackingShips, planet, isDefending = false) {
    const dialog = document.getElementById('battleDialog');
    const attackPower = attackingShips.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);
    const defensePower = planet.ships.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);

    if (isDefending) {
        // Enemy is attacking player's planet
        dialog.innerHTML = `
            <h2>🚨 UNDER ATTACK!</h2>
            <div class="battle-info">
                <p><strong>Location:</strong> ${planet.name}</p>
                <p><strong>Enemy Fleet:</strong> ${attackingShips.length} ships (Power: ${attackPower})</p>
                <p><strong>Your Defenders:</strong> ${planet.ships.length} ships (Power: ${defensePower})</p>
            </div>
            <div class="battle-buttons">
                <button class="battle-btn fight" onclick="window.resolveBattle('fight')">🛡️ DEFEND</button>
                <button class="battle-btn withdraw" onclick="window.resolveBattle('withdraw')">🏃 RETREAT</button>
            </div>
        `;
    } else {
        // Player is attacking
        dialog.innerHTML = `
            <h2>⚔️ BATTLE!</h2>
            <div class="battle-info">
                <p><strong>Target:</strong> ${planet.name}</p>
                <p><strong>Your Fleet:</strong> ${attackingShips.length} ships (Power: ${attackPower})</p>
                <p><strong>Defenders:</strong> ${planet.ships.length} ships (Power: ${defensePower})</p>
            </div>
            <div class="battle-buttons">
                <button class="battle-btn fight" onclick="window.resolveBattle('fight')">⚔️ ATTACK</button>
                <button class="battle-btn withdraw" onclick="window.resolveBattle('withdraw')">🏃 WITHDRAW</button>
            </div>
        `;
    }

    dialog.style.display = 'block';
}

export function showGameOver(victory) {
    // Close any open battle dialogs first - game is over, only show game over screen
    document.getElementById('battleDialog').style.display = 'none';
    document.getElementById('battleResultsDialog').style.display = 'none';

    // Also close the unified planet panel
    document.getElementById('unifiedPanel').style.display = 'none';

    const screen = document.getElementById('gameOverScreen');
    screen.className = victory ? 'victory' : 'defeat';

    // Update title and message
    document.getElementById('gameOverTitle').textContent = victory ? 'VICTORY!' : 'DEFEAT';
    document.getElementById('gameOverMessage').textContent = victory
        ? 'You have conquered the galaxy!'
        : 'Your empire has fallen...';

    // Calculate and display final score
    const finalScore = calculateScore('player');
    const scoreDiv = document.getElementById('gameOverScore');
    scoreDiv.innerHTML = `
        <div class="final-score">Final Score: <span class="score-value">${finalScore.toLocaleString()}</span></div>
        <div class="final-turn">Turn: ${gameState.turn}</div>
    `;

    // Show/hide leaderboard button based on login status
    const leaderboardBtn = document.getElementById('gameOverLeaderboardBtn');
    if (leaderboardBtn) {
        leaderboardBtn.style.display = gameState.userId ? 'block' : 'none';
    }

    screen.style.display = 'flex';
}
