// ============================================
// MAIN - GAME INITIALIZATION & ORCHESTRATION
// ============================================
//
// This is the entry point for the game. It coordinates the initialization
// of all game systems and starts the game loop when the page loads.
//
// Core Responsibilities:
// - Wait for DOM to be fully loaded before initialization
// - Initialize game state, canvas, and start screen
// - Bind all event listeners for user input
// - Start the continuous rendering loop
// - Initialize the UI display with starting values
// - Provide console logging for debugging initialization
//
// Module Load Order:
// 1. gameState.init() - Sets up canvas, camera, planets, and start screen
// 2. setupEventListeners() - Binds mouse, touch, and UI event handlers
// 3. gameLoop() - Starts continuous requestAnimationFrame rendering
// 4. updateDisplay() - Shows initial resource and score values
//
// This module imports from all other modules but exports nothing - it is
// purely an orchestration layer that brings the game to life.
//
// Used by: index.html (loaded as the final module script)

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
