// ============================================
// INPUT HANDLER
// ============================================
//
// This module handles all user input including mouse, touch, and keyboard events,
// translating them into game actions and UI interactions.
//
// Core Responsibilities:
// - Process mouse events (click, drag, scroll) for planet selection and camera control
// - Handle touch gestures (pan, pinch-zoom, tap) for mobile support
// - Detect planet clicks for selection and destination targeting
// - Manage camera panning with mouse drag or touch drag
// - Implement mouse wheel and pinch zoom with constraints (0.5x-3x)
// - Process "End Turn" button click with AI turn and game state updates
// - Expose window functions for HTML onclick handlers (build, send, cancel, battle)
// - Distinguish between drag (camera pan) and click (planet selection)
// - Handle destination selection mode for fleet movement
//
// Event Flow:
// 1. Mouse/touch down → Track start position, begin potential drag
// 2. Mouse/touch move → Update camera position if dragging
// 3. Mouse/touch up → If not dragged, process click (select planet or send fleet)
// 4. Wheel/pinch → Adjust camera zoom level
//
// Exports:
// - setupEventListeners(): Binds all event handlers to canvas and UI elements
//
// Window Functions (for HTML onclick):
// - buildShipType(), cancelBuildItem(), sendSelectedShips(), resolveBattle(), completeRetreat(), etc.
//
// Used by: main.js (called once during initialization)
//
// Version History:
// - 1.0.3: Added influence zone toggle controls (button and 'I' keyboard shortcut)
// - 1.0.2: Added completeRetreat function for tactical withdrawal destination selection

import { gameState, camera, canvas, saveSettings } from './gameState.js';
import { screenToWorld, clampCamera, updateZoomIndicator, getPlanetAt } from './camera.js';
import { selectPlanet, updateDisplay, updatePlanetPanel, updateFleetPanel, updateShipyardPanel, showBattleDialog, closePlanetPanel, switchFleetTab, showNotification, showGameOver } from './uiManager.js';
import { completeShipSend, buildShip, cancelBuild, sendSelectedShips } from './shipSystem.js';
import { endTurn, checkGameEnd } from './turnSystem.js';
import { processAITurn } from './aiSystem.js';
import { resolveBattleChoice, completeRetreat } from './combatSystem.js';
import { SHIP_TYPES } from './config.js';
import { toggleInfluenceZones, invalidateZoneCache, influenceZonesVisible } from './influenceZones.js';
import { completeGame } from './saveSystem.js';

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
    document.getElementById('settingsBtn').addEventListener('click', openSettings);

    // In-game transparency slider
    const gameTransparencySlider = document.getElementById('gameTransparencySlider');
    const gameTransparencyValue = document.getElementById('gameTransparencyValue');
    gameTransparencySlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        gameState.influenceTransparency = value / 100;
        gameTransparencyValue.textContent = `${value}%`;
        saveSettings(); // Save immediately when changed
        invalidateZoneCache(); // Force zone recalculation with new transparency
    });

    // Influence zones toggle switch
    const influenceZonesToggle = document.getElementById('influenceZonesToggle');
    influenceZonesToggle.addEventListener('change', (e) => {
        handleInfluenceToggle();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
    // Open settings with 'S' key
    if (e.key === 's' || e.key === 'S') {
        const settingsOverlay = document.getElementById('settingsOverlay');
        if (!settingsOverlay.classList.contains('active')) {
            openSettings();
        }
    }

    // Close settings with ESC key
    if (e.key === 'Escape') {
        const settingsOverlay = document.getElementById('settingsOverlay');
        if (settingsOverlay.classList.contains('active')) {
            closeSettings();
        }
    }
}

function handleInfluenceToggle() {
    const isVisible = toggleInfluenceZones();
    const toggle = document.getElementById('influenceZonesToggle');

    // Update toggle state if it was changed programmatically
    if (toggle.checked !== isVisible) {
        toggle.checked = isVisible;
    }

    if (isVisible) {
        showNotification('🗺️ Influence zones enabled');
    } else {
        showNotification('🗺️ Influence zones disabled');
    }
}

function openSettings() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    const gameTransparencySlider = document.getElementById('gameTransparencySlider');
    const gameTransparencyValue = document.getElementById('gameTransparencyValue');
    const influenceZonesToggle = document.getElementById('influenceZonesToggle');

    // Sync slider with current game state
    const currentValue = Math.round(gameState.influenceTransparency * 100);
    gameTransparencySlider.value = currentValue;
    gameTransparencyValue.textContent = `${currentValue}%`;

    // Sync toggle with current game state
    influenceZonesToggle.checked = influenceZonesVisible;

    settingsOverlay.classList.add('active');
}

window.closeSettings = function() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    settingsOverlay.classList.remove('active');
};

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
            // Toggle planet selection (click to unselect)
            if (gameState.selectedPlanet === planet) {
                selectPlanet(null);
            } else {
                selectPlanet(planet);
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
                // Toggle planet selection (tap to unselect)
                if (gameState.selectedPlanet === planet) {
                    selectPlanet(null);
                } else {
                    selectPlanet(planet);
                }
            }
        }
    }
}

async function handleEndTurn() {
    await endTurn();

    // Invalidate influence zone cache
    invalidateZoneCache();

    // Process AI turn
    processAITurn();

    // Check game end
    const result = checkGameEnd();
    if (result.gameOver) {
        gameState.gameOver = true;
        // Save to leaderboard (for authenticated users, victories only)
        if (gameState.userId) {
            completeGame(result.victory).catch(err => console.error('Failed to save game completion:', err));
        }
        showGameOver(result.victory);
    }

    // Show battle dialog if needed
    if (gameState.battlePending) {
        showBattleDialog(
            gameState.battlePending.attackingShips,
            gameState.battlePending.planet,
            gameState.battlePending.isDefending
        );
    }

    updateDisplay();

    if (gameState.selectedPlanet) {
        updatePlanetPanel(gameState.selectedPlanet);
        updateFleetPanel();

        // Update shipyard panel if player owns the selected planet
        if (gameState.selectedPlanet.owner === 'player') {
            updateShipyardPanel();
        }
    }
}

// Make functions available globally for HTML onclick handlers
window.closePlanetPanel = closePlanetPanel;

window.switchFleetTab = switchFleetTab;

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

window.toggleShipSelection = (shipId) => {
    if (gameState.selectedShipIds.has(shipId)) {
        gameState.selectedShipIds.delete(shipId);
    } else {
        gameState.selectedShipIds.add(shipId);
    }
    updateFleetPanel();
};

// Toggle selection of one ship of a given type (click to select, click again to deselect)
window.toggleShipTypeSelection = (shipType) => {
    if (!gameState.selectedPlanet) return;

    const playerShips = gameState.selectedPlanet.ships.filter(s => s.owner === 'player' && s.type === shipType);
    if (playerShips.length === 0) return;

    // Find first unselected ship of this type
    const unselectedShip = playerShips.find(s => !gameState.selectedShipIds.has(s.id));

    if (unselectedShip) {
        // Select one more ship of this type
        gameState.selectedShipIds.add(unselectedShip.id);
    } else {
        // All ships of this type are selected - deselect the last one
        const selectedOfType = playerShips.filter(s => gameState.selectedShipIds.has(s.id));
        if (selectedOfType.length > 0) {
            gameState.selectedShipIds.delete(selectedOfType[selectedOfType.length - 1].id);
        }
    }
    updateFleetPanel();
};

window.sendSelectedShips = () => {
    sendSelectedShips();
    updateFleetPanel();
};

window.closeBattleResults = () => {
    document.getElementById('battleResultsDialog').style.display = 'none';
    updateDisplay();
    if (gameState.selectedPlanet) {
        updatePlanetPanel(gameState.selectedPlanet);
        updateFleetPanel();
        if (gameState.selectedPlanet.owner === 'player') {
            updateShipyardPanel();
        }
    }
};

window.completeRetreat = (planetId) => {
    completeRetreat(planetId);
    updateDisplay();
    if (gameState.selectedPlanet) {
        updatePlanetPanel(gameState.selectedPlanet);
        updateFleetPanel();
    }
};
