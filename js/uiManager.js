// ============================================
// UI MANAGER
// ============================================

import { gameState } from './gameState.js';
import { buildShip, cancelBuild } from './shipSystem.js';
import { SHIP_TYPES } from './config.js';

// Export functions used by other modules and HTML onclick handlers
export function togglePlanetPanel() {
    const panel = document.getElementById('planetPanel');
    const isVisible = panel.style.display === 'block';

    if (isVisible || !gameState.selectedPlanet) {
        closePlanetPanel();
    } else {
        updatePlanetPanel(gameState.selectedPlanet);
        panel.style.display = 'block';
    }
}

export function toggleFleetPanel() {
    const panel = document.getElementById('fleetPanel');
    const isVisible = panel.style.display === 'block';

    if (isVisible) {
        closeFleetPanel();
    } else {
        updateFleetPanel();
        panel.style.display = 'block';
    }
}

export function toggleShipyardPanel() {
    const panel = document.getElementById('shipyardPanel');
    const isVisible = panel.style.display === 'block';

    if (isVisible || !gameState.selectedPlanet || gameState.selectedPlanet.owner !== 'player') {
        closeShipyardPanel();
    } else {
        updateShipyardPanel();
        panel.style.display = 'block';
    }
}

export function closePlanetPanel() {
    document.getElementById('planetPanel').style.display = 'none';
    gameState.selectedPlanet = null;
}

export function closeFleetPanel() {
    document.getElementById('fleetPanel').style.display = 'none';
}

export function closeShipyardPanel() {
    document.getElementById('shipyardPanel').style.display = 'none';
}

export function updateDisplay() {
    // Update resource display
    document.getElementById('energyCount').textContent = Math.floor(gameState.players.player.energy);
    document.getElementById('mineralsCount').textContent = Math.floor(gameState.players.player.minerals);
    document.getElementById('foodCount').textContent = Math.floor(gameState.players.player.food);
    document.getElementById('turnCount').textContent = gameState.turn;
}

export function updatePlanetPanel(planet) {
    const panel = document.getElementById('planetPanel');
    if (!planet) return;

    const content = `
        <div class="planet-header">
            <span class="planet-name">${planet.name}</span>
            <button class="close-btn" onclick="window.closePlanetPanel()">&times;</button>
        </div>
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
        const playerPlanets = gameState.planets.filter(p => p.owner === 'player' && p.ships.length > 0);

        for (const planet of playerPlanets) {
            content += `
                <div class="fleet-planet">
                    <div class="fleet-planet-name">${planet.name}</div>
            `;

            const shipCounts = {};
            for (const ship of planet.ships) {
                shipCounts[ship.type] = (shipCounts[ship.type] || 0) + 1;
            }

            for (const [type, count] of Object.entries(shipCounts)) {
                const shipType = SHIP_TYPES[type];
                content += `
                    <div class="ship-row">
                        <div class="ship-info">
                            <span>${shipType.icon}</span>
                            <span>${shipType.name}</span>
                            <span class="ship-count">${count}</span>
                        </div>
                    </div>
                `;
            }

            content += '</div>';
        }
    } else if (tab === 'transit') {
        const playerShips = gameState.travelingShips.filter(g => g.owner === 'player');

        for (const group of playerShips) {
            const fromPlanet = gameState.planets.find(p => p.id === group.fromPlanetId);
            const toPlanet = gameState.planets.find(p => p.id === group.targetPlanetId);

            content += `
                <div class="fleet-planet">
                    <div class="fleet-planet-name">${fromPlanet?.name || '?'} → ${toPlanet?.name || '?'}</div>
                    <div style="font-size:0.8rem;color:#888;">ETA: ${group.turnsRemaining} turns</div>
            `;

            const shipCounts = {};
            for (const ship of group.ships) {
                shipCounts[ship.type] = (shipCounts[ship.type] || 0) + 1;
            }

            for (const [type, count] of Object.entries(shipCounts)) {
                const shipType = SHIP_TYPES[type];
                content += `
                    <div class="ship-row">
                        <div class="ship-info">
                            <span>${shipType.icon}</span>
                            <span>${shipType.name}</span>
                            <span class="ship-count">${count}</span>
                        </div>
                    </div>
                `;
            }

            content += '</div>';
        }
    }

    panel.innerHTML = content || '<p style="color:#888;text-align:center;padding:20px;">No ships</p>';
}

export function updateShipyardPanel() {
    const planet = gameState.selectedPlanet;
    if (!planet || planet.owner !== 'player') return;

    const panel = document.getElementById('shipyardContent');

    let content = '<h4>Build Ships</h4><div class="build-options">';

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

    content += '</div>';

    // Build queue
    if (planet.buildQueue.length > 0) {
        content += '<div class="build-queue"><h4>Build Queue</h4>';

        for (const item of planet.buildQueue) {
            const shipType = SHIP_TYPES[item.type];
            content += `
                <div class="queue-item">
                    <span>${shipType.icon} ${shipType.name} (${item.turnsRemaining} turns)</span>
                    <button class="queue-cancel" onclick="window.cancelBuildItem('${planet.id}', '${item.id}')">&times;</button>
                </div>
            `;
        }

        content += '</div>';
    }

    panel.innerHTML = content;
}

export function selectPlanet(planet) {
    gameState.selectedPlanet = planet;
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

export function showBattleDialog(attackingShips, planet) {
    const dialog = document.getElementById('battleDialog');
    const attackPower = attackingShips.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);
    const defensePower = planet.ships.reduce((sum, s) => sum + SHIP_TYPES[s.type].attack, 0);

    dialog.innerHTML = `
        <h2>⚔️ BATTLE!</h2>
        <div class="battle-info">
            <p><strong>Target:</strong> ${planet.name}</p>
            <p><strong>Your Fleet:</strong> ${attackingShips.length} ships (Power: ${attackPower})</p>
            <p><strong>Defenders:</strong> ${planet.ships.length} ships (Power: ${defensePower})</p>
        </div>
        <div class="battle-buttons">
            <button class="battle-btn fight" onclick="window.resolveBattle('fight')">FIGHT</button>
            <button class="battle-btn withdraw" onclick="window.resolveBattle('withdraw')">WITHDRAW</button>
        </div>
    `;

    dialog.style.display = 'block';
}

export function showGameOver(victory) {
    const screen = document.getElementById('gameOverScreen');
    screen.className = victory ? 'victory' : 'defeat';
    screen.innerHTML = `
        <h1>${victory ? 'VICTORY!' : 'DEFEAT'}</h1>
        <p>${victory ? 'You have conquered the galaxy!' : 'Your empire has fallen...'}</p>
        <p>Final Turn: ${gameState.turn}</p>
        <button id="restartBtn" onclick="location.reload()">PLAY AGAIN</button>
    `;
    screen.style.display = 'flex';
}
