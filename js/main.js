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
// - Handle authentication flow (login/register/guest)
// - Manage screen transitions (auth → start → game)
// - Bind all event listeners for user input
// - Start the continuous rendering loop
// - Initialize the UI display with starting values
// - Provide console logging for debugging initialization
//
// Module Load Order:
// 1. Check auth state and show appropriate screen
// 2. gameState.init() - Sets up canvas, camera, planets, and start screen
// 3. setupEventListeners() - Binds mouse, touch, and UI event handlers
// 4. gameLoop() - Starts continuous requestAnimationFrame rendering
// 5. updateDisplay() - Shows initial resource and score values
//
// This module imports from all other modules but exports nothing - it is
// purely an orchestration layer that brings the game to life.
//
// Used by: index.html (loaded as the final module script)
//
// Version History:
// - 1.1.0: Added Supabase authentication, saved games, and leaderboards

import { init, gameState, setMapSeed, restartWithSameSeed, resetGameState } from './gameState.js';
import { setupEventListeners } from './inputHandler.js';
import { gameLoop } from './renderer.js';
import { updateDisplay } from './uiManager.js';
import { initAuth, signIn, signUp, signOut, getProfile, applyProfileToGameState, saveSettingsToProfile } from './auth.js';
import { listSavedGames, loadSavedGame, deleteSavedGame, completeGame, clearCurrentSave } from './saveSystem.js';
import { getPersonalTop10, getGlobalTop10, getCompletedGameDetails, renderLeaderboardEntries, renderMapViewerInfo, drawMapPreview } from './leaderboard.js';
import { invalidateZoneCache } from './influenceZones.js';

let currentLeaderboardTab = 'personal';
let pendingDeleteSaveId = null;
let currentMapViewerData = null;

// Initialize game on page load
window.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing 4X Space Game...');

    // Initialize canvas and basic state first
    init();
    setupEventListeners();
    gameLoop();

    // Setup all handlers FIRST (before any async operations)
    setupAuthHandlers();
    setupStartScreenHandlers();
    setupLeaderboardHandlers();
    setupGameOverHandlers();

    // Check authentication state
    try {
        const authResult = await initAuth();

        if (authResult.authenticated) {
            // User is logged in - show start screen with saved games
            showStartScreen(authResult.profile);
        } else {
            // Show auth screen
            showAuthScreen();
        }
    } catch (error) {
        console.error('Auth initialization failed:', error);
        // Show auth screen anyway so user can still try to login/register
        showAuthScreen();
    }

    console.log('Game initialized successfully!');
});

function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('ui').style.display = 'none';
}

function showStartScreen(profile = null) {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    document.getElementById('ui').style.display = 'none';

    if (profile) {
        // Show user info
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('usernameDisplay').textContent = profile.username;

        // Show saved games section and leaderboard button
        document.getElementById('savedGamesSection').style.display = 'block';
        document.getElementById('leaderboardBtnContainer').style.display = 'block';
        document.getElementById('newGameDivider').style.display = 'flex';

        // Load saved games
        loadAndDisplaySavedGames();

        // Apply profile preferences to UI
        applyProfileToUI(profile);
    } else {
        // Guest mode - hide authenticated-only features
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('savedGamesSection').style.display = 'none';
        document.getElementById('leaderboardBtnContainer').style.display = 'none';
        document.getElementById('newGameDivider').style.display = 'none';
    }
}

function applyProfileToUI(profile) {
    // Apply saved preferences to start screen UI

    // Player color
    const playerColorPicker = document.getElementById('playerColorPicker');
    playerColorPicker.querySelectorAll('.color-tile').forEach(tile => {
        tile.classList.remove('selected');
        if (tile.dataset.color === profile.preferred_player_color) {
            tile.classList.add('selected');
        }
    });

    // AI color
    const aiColorPicker = document.getElementById('aiColorPicker');
    aiColorPicker.querySelectorAll('.color-tile').forEach(tile => {
        tile.classList.remove('selected');
        if (tile.dataset.color === profile.preferred_ai_color) {
            tile.classList.add('selected');
        }
    });

    // Map size
    document.querySelectorAll('[data-size]').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.size === profile.preferred_map_size) {
            btn.classList.add('selected');
        }
    });

    // Difficulty
    document.querySelectorAll('[data-difficulty]').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.difficulty === profile.preferred_difficulty) {
            btn.classList.add('selected');
        }
    });

    // Transparency slider
    const transparencySlider = document.getElementById('transparencySlider');
    const transparencyValue = Math.round((profile.preferred_influence_transparency || 0.10) * 100);
    transparencySlider.value = transparencyValue;
    document.getElementById('transparencyValue').textContent = `${transparencyValue}%`;
}

async function loadAndDisplaySavedGames() {
    const result = await listSavedGames();
    const container = document.getElementById('savedGamesList');

    if (!result.success || result.saves.length === 0) {
        container.innerHTML = '<p class="no-saves">No saved games</p>';
        return;
    }

    container.innerHTML = result.saves.map(save => {
        const updatedDate = new Date(save.updated_at).toLocaleDateString();
        return `
            <div class="saved-game-item" data-save-id="${save.id}">
                <div class="save-info">
                    <span class="save-turn">Turn ${save.current_turn}</span>
                    <span class="save-details">${save.map_size} | ${save.difficulty}</span>
                    <span class="save-date">${updatedDate}</span>
                </div>
                <div class="save-stats">
                    <span class="planets-owned">🪐 ${save.player_planets}</span>
                    <span class="score">⭐ ${save.player_score}</span>
                </div>
                <div class="save-actions">
                    <button class="resume-btn" onclick="resumeSavedGame('${save.id}')">RESUME</button>
                    <button class="delete-btn" onclick="confirmDeleteSave('${save.id}')">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function setupAuthHandlers() {
    // Login form
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        if (!email || !password) {
            errorDiv.textContent = 'Please enter email and password';
            return;
        }

        errorDiv.textContent = '';
        const result = await signIn(email, password);

        if (result.error) {
            errorDiv.textContent = result.error.message;
        } else {
            const profile = await getProfile();
            applyProfileToGameState(profile);
            showStartScreen(profile);
        }
    });

    // Register form
    document.getElementById('registerBtn').addEventListener('click', async () => {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const errorDiv = document.getElementById('registerError');

        if (!username || !email || !password) {
            errorDiv.textContent = 'Please fill in all fields';
            return;
        }

        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }

        errorDiv.textContent = '';
        const result = await signUp(email, password, username);

        if (result.error) {
            errorDiv.textContent = result.error.message;
        } else {
            const profile = await getProfile();
            applyProfileToGameState(profile);
            showStartScreen(profile);
        }
    });

    // Toggle between login and register
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });

    // Guest mode
    document.getElementById('guestBtn').addEventListener('click', () => {
        showStartScreen(null);
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut();
        showAuthScreen();
    });
}

function setupStartScreenHandlers() {
    // Leaderboard button
    document.getElementById('leaderboardBtn').addEventListener('click', () => {
        openLeaderboard();
    });
}

function setupLeaderboardHandlers() {
    // Tab switching is handled by window functions
    // Close button is inline onclick

    // Replay from viewer button
    document.getElementById('replayFromViewerBtn').addEventListener('click', () => {
        if (currentMapViewerData) {
            replayFromLeaderboard(currentMapViewerData);
        }
    });

    // Delete confirmation buttons
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (pendingDeleteSaveId) {
            await deleteSavedGame(pendingDeleteSaveId);
            pendingDeleteSaveId = null;
            document.getElementById('deleteConfirmDialog').style.display = 'none';
            loadAndDisplaySavedGames();
        }
    });

    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        pendingDeleteSaveId = null;
        document.getElementById('deleteConfirmDialog').style.display = 'none';
    });
}

function setupGameOverHandlers() {
    // Replay same map
    document.getElementById('replaySameMapBtn').addEventListener('click', () => {
        document.getElementById('gameOverScreen').style.display = 'none';
        restartWithSameSeed();
        invalidateZoneCache();
        document.getElementById('ui').style.display = 'flex';
        updateDisplay();
    });

    // New game
    document.getElementById('newGameBtn').addEventListener('click', () => {
        document.getElementById('gameOverScreen').style.display = 'none';
        clearCurrentSave();
        showStartScreen(gameState.userId ? { username: gameState.username } : null);
        // Reload saved games and profile if logged in
        if (gameState.userId) {
            getProfile().then(profile => {
                if (profile) {
                    applyProfileToUI(profile);
                    loadAndDisplaySavedGames();
                }
            });
        }
    });

    // Leaderboard from game over
    document.getElementById('gameOverLeaderboardBtn').addEventListener('click', () => {
        openLeaderboard();
    });

    // Main menu
    document.getElementById('mainMenuBtn').addEventListener('click', async () => {
        document.getElementById('gameOverScreen').style.display = 'none';
        clearCurrentSave();
        resetGameState();

        if (gameState.userId) {
            const profile = await getProfile();
            showStartScreen(profile);
        } else {
            showAuthScreen();
        }
    });
}

async function openLeaderboard() {
    const panel = document.getElementById('leaderboardPanel');
    panel.style.display = 'flex';

    // Load personal leaderboard by default
    currentLeaderboardTab = 'personal';
    await loadLeaderboardTab('personal');
}

async function loadLeaderboardTab(tab) {
    currentLeaderboardTab = tab;
    const content = document.getElementById('leaderboardContent');
    content.innerHTML = '<p class="loading">Loading...</p>';

    // Update tab buttons
    document.querySelectorAll('.leaderboard-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    let entries = [];
    if (tab === 'personal') {
        entries = await getPersonalTop10();
    } else {
        entries = await getGlobalTop10();
    }

    content.innerHTML = renderLeaderboardEntries(entries, tab === 'personal');
}

async function viewLeaderboardGame(gameId) {
    const gameData = await getCompletedGameDetails(gameId);
    if (!gameData) {
        console.error('Failed to load game details');
        return;
    }

    currentMapViewerData = gameData;

    // Update modal content
    document.getElementById('mapViewerTitle').textContent = `${gameData.username}'s Victory`;
    document.getElementById('mapViewerInfo').innerHTML = renderMapViewerInfo(gameData);

    // Draw map preview
    const canvas = document.getElementById('mapViewerCanvas');
    drawMapPreview(canvas, gameData.final_map_state, gameData.player_color, gameData.ai_color);

    // Show modal
    document.getElementById('mapViewerModal').style.display = 'flex';
}

function replayFromLeaderboard(gameData) {
    // Close modals
    document.getElementById('mapViewerModal').style.display = 'none';
    document.getElementById('leaderboardPanel').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';

    // Set up game with same parameters
    gameState.mapSize = gameData.map_size;
    gameState.difficulty = gameData.difficulty;
    gameState.playerColor = gameData.player_color;
    gameState.aiColor = gameData.ai_color;
    gameState.influenceTransparency = gameData.influence_transparency || 0.10;

    // Clear any existing save reference
    clearCurrentSave();

    // Restart with the same seed
    setMapSeed(gameData.map_seed);
    restartWithSameSeed();
    invalidateZoneCache();

    // Show game UI
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('ui').style.display = 'flex';
    updateDisplay();
}

// Window functions for HTML onclick handlers
window.resumeSavedGame = async (saveId) => {
    const result = await loadSavedGame(saveId);
    if (result.success) {
        invalidateZoneCache();
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('ui').style.display = 'flex';
        updateDisplay();
    } else {
        console.error('Failed to load saved game:', result.error);
    }
};

window.confirmDeleteSave = (saveId) => {
    pendingDeleteSaveId = saveId;
    document.getElementById('deleteConfirmDialog').style.display = 'flex';
};

window.closeLeaderboard = () => {
    document.getElementById('leaderboardPanel').style.display = 'none';
};

window.switchLeaderboardTab = (tab) => {
    loadLeaderboardTab(tab);
};

window.viewLeaderboardGame = viewLeaderboardGame;

window.closeMapViewer = () => {
    document.getElementById('mapViewerModal').style.display = 'none';
    currentMapViewerData = null;
};

// Export for use in other modules
export { completeGame };
