// ============================================
// MAIN - GAME INITIALIZATION & ORCHESTRATION
// ============================================

import { init } from './gameState.js';
import { setupEventListeners } from './inputHandler.js';
import { gameLoop } from './renderer.js';
import { updateDisplay } from './uiManager.js';

// Initialize game on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing 4X Space Game...');

    init();
    setupEventListeners();
    gameLoop();
    updateDisplay();

    console.log('Game initialized successfully!');
});
