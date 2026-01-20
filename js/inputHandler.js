// ============================================
// INPUT HANDLER
// ============================================

import { gameState, camera, canvas } from './gameState.js';
import { screenToWorld, clampCamera, updateZoomIndicator, getPlanetAt } from './camera.js';
import { selectPlanet, updateDisplay, updatePlanetPanel, updateFleetPanel, showBattleDialog, closePlanetPanel, switchFleetTab, updateShipyardPanel, showNotification, showGameOver } from './uiManager.js';
import { completeShipSend, buildShip, cancelBuild } from './shipSystem.js';
import { endTurn, checkGameEnd } from './turnSystem.js';
import { processAITurn } from './aiSystem.js';
import { resolveBattleChoice } from './combatSystem.js';
import { SHIP_TYPES } from './config.js';

export function setupEventListeners() {
    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('click', handleClick);

    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // UI buttons
    document.getElementById('endTurnBtn').addEventListener('click', handleEndTurn);
}

function handleMouseDown(e) {
    camera.isDragging = true;
    camera.lastX = e.clientX;
    camera.lastY = e.clientY;
}

function handleMouseMove(e) {
    if (!camera.isDragging) return;

    const dx = e.clientX - camera.lastX;
    const dy = e.clientY - camera.lastY;

    camera.x -= dx / camera.zoom;
    camera.y -= dy / camera.zoom;

    clampCamera();

    camera.lastX = e.clientX;
    camera.lastY = e.clientY;
}

function handleMouseUp(e) {
    camera.isDragging = false;
}

function handleWheel(e) {
    e.preventDefault();

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = camera.zoom * zoomFactor;

    if (newZoom >= camera.minZoom && newZoom <= camera.maxZoom) {
        // Zoom towards mouse position
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const worldBefore = screenToWorld(mouseX, mouseY);

        camera.zoom = newZoom;

        const worldAfter = screenToWorld(mouseX, mouseY);

        camera.x += worldBefore.x - worldAfter.x;
        camera.y += worldBefore.y - worldAfter.y;

        clampCamera();
        updateZoomIndicator();
    }
}

function handleClick(e) {
    if (camera.isDragging) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const planet = getPlanetAt(worldPos.x, worldPos.y);

    if (planet) {
        if (gameState.selectingDestination) {
            // Complete ship sending
            completeShipSend(planet);
            updateDisplay();
            updateFleetPanel();
        } else {
            // Select planet
            selectPlanet(planet);

            if (planet.owner === 'player') {
                updatePlanetPanel(planet);
                document.getElementById('planetPanel').style.display = 'block';
            }
        }
    }
}

let touchStartDist = 0;
let touchStartZoom = 1;

function handleTouchStart(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
        camera.isDragging = true;
        camera.lastX = e.touches[0].clientX;
        camera.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        camera.isDragging = false;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
        touchStartZoom = camera.zoom;
    }
}

function handleTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1 && camera.isDragging) {
        const dx = e.touches[0].clientX - camera.lastX;
        const dy = e.touches[0].clientY - camera.lastY;

        camera.x -= dx / camera.zoom;
        camera.y -= dy / camera.zoom;

        clampCamera();

        camera.lastX = e.touches[0].clientX;
        camera.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        const newZoom = touchStartZoom * (currentDist / touchStartDist);

        if (newZoom >= camera.minZoom && newZoom <= camera.maxZoom) {
            camera.zoom = newZoom;
            clampCamera();
            updateZoomIndicator();
        }
    }
}

function handleTouchEnd(e) {
    camera.isDragging = false;

    if (e.touches.length === 0 && e.changedTouches.length === 1) {
        // Single tap - handle click
        const touch = e.changedTouches[0];
        const worldPos = screenToWorld(touch.clientX, touch.clientY);
        const planet = getPlanetAt(worldPos.x, worldPos.y);

        if (planet) {
            if (gameState.selectingDestination) {
                completeShipSend(planet);
                updateDisplay();
                updateFleetPanel();
            } else {
                selectPlanet(planet);

                if (planet.owner === 'player') {
                    updatePlanetPanel(planet);
                    document.getElementById('planetPanel').style.display = 'block';
                }
            }
        }
    }
}

function handleEndTurn() {
    endTurn();

    // Process AI turn
    processAITurn();

    // Check game end
    const result = checkGameEnd();
    if (result.gameOver) {
        showGameOver(result.victory);
    }

    // Show battle dialog if needed
    if (gameState.battlePending) {
        showBattleDialog(gameState.battlePending.attackingShips, gameState.battlePending.planet);
    }

    updateDisplay();

    if (gameState.selectedPlanet) {
        updatePlanetPanel(gameState.selectedPlanet);
    }

    updateFleetPanel();
}

// Make functions available globally for HTML onclick handlers
window.closePlanetPanel = () => {
    closePlanetPanel();
};

window.closeFleetPanel = () => {
    closeFleetPanel();
};

window.closeShipyardPanel = () => {
    closeShipyardPanel();
};

window.switchFleetTab = (tab) => {
    switchFleetTab(tab);
};

window.buildShipType = (type) => {
    if (buildShip(type)) {
        showNotification(`Building ${SHIP_TYPES[type].name}`);
        updateDisplay();
        updateShipyardPanel();
    }
};

window.cancelBuildItem = (planetId, buildId) => {
    if (cancelBuild(planetId, buildId)) {
        showNotification('Build cancelled (50% refund)');
        updateDisplay();
        updateShipyardPanel();
    }
};

window.resolveBattle = (choice) => {
    resolveBattleChoice(choice);
    updateDisplay();
};
