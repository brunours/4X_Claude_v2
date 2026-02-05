// ============================================
// MAIN - GAME INITIALIZATION & ORCHESTRATION
// ============================================
// Version: 2.0.11
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

import { init, gameState, setMapSeed, restartWithSameSeed, resetGameState, updateColorPickers } from './gameState.js';
import { setupEventListeners } from './inputHandler.js';
import { gameLoop } from './renderer.js';
import { updateDisplay } from './uiManager.js';
import { initAuth, signIn, signUp, signOut, getProfile, applyProfileToGameState, saveSettingsToProfile, updateProfile, requestPasswordReset, updatePassword, onAuthStateChange } from './auth.js';
import { listSavedGames, loadSavedGame, deleteSavedGame, completeGame, clearCurrentSave } from './saveSystem.js';
import { getPersonalTop10, getGlobalTop10, getPersonalBestByDifficulty, getGlobalTop5ByDifficulty, getCompletedGameDetails, renderLeaderboardEntries, renderLeaderboardByDifficulty, renderMapViewerInfo, drawMapPreview } from './leaderboard.js';
import { invalidateZoneCache } from './influenceZones.js';

let currentLeaderboardTab = 'personal';
let pendingDeleteSaveId = null;
let currentMapViewerData = null;

// Initialize game on page load
window.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing 4X Space Game...');

    try {
        // Initialize canvas and basic state first
        console.log('Calling init()...');
        init();
        console.log('Calling setupEventListeners()...');
        setupEventListeners();
        console.log('Calling gameLoop()...');
        gameLoop();

        // Setup all handlers FIRST (before any async operations)
        console.log('Setting up auth handlers...');
        setupAuthHandlers();
        console.log('Setting up start screen handlers...');
        setupStartScreenHandlers();
        console.log('Setting up leaderboard handlers...');
        setupLeaderboardHandlers();
        console.log('Setting up game over handlers...');
        setupGameOverHandlers();
        console.log('All handlers setup complete!');

        // Listen for PASSWORD_RECOVERY event (when user clicks email reset link)
        onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                console.log('Password recovery mode detected');
                // Hide all forms and show update password form
                document.getElementById('authScreen').style.display = 'flex';
                document.getElementById('startScreen').style.display = 'none';
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('registerForm').style.display = 'none';
                document.getElementById('forgotPasswordForm').style.display = 'none';
                document.getElementById('updatePasswordForm').style.display = 'block';
            }
        });
    } catch (error) {
        console.error('Error during initialization:', error);
    }

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

    // Check if user is authenticated (has userId set)
    const isAuthenticated = gameState.userId !== null;

    if (isAuthenticated) {
        // Show user info (even if profile is null, use username from gameState)
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('nicknameDisplay').textContent = gameState.username || 'User';

        // Show saved games container and leaderboard button
        document.getElementById('savedGamesContainer').style.display = 'block';
        document.getElementById('leaderboardBtn').style.display = 'inline-block';

        // Load saved games
        loadAndDisplaySavedGames();

        // Apply profile preferences to UI (if profile exists)
        if (profile) {
            applyProfileToUI(profile);
        }
        // If no profile, UI will use current gameState values (defaults)
    } else {
        // Guest mode - hide authenticated-only features
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('savedGamesContainer').style.display = 'none';
        document.getElementById('leaderboardBtn').style.display = 'none';
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

    // Planet name theme
    const planetTheme = profile.preferred_planet_names || 'greek';
    document.querySelectorAll('[data-planet-names]').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.planetNames === planetTheme) {
            btn.classList.add('selected');
        }
    });

    // Refresh color pickers to update disabled/selected states correctly
    updateColorPickers();
}

// Track saved games state
let allSavedGames = [];
let savedGamesExpanded = false;
const SAVED_GAMES_COLLAPSED_COUNT = 2;

async function loadAndDisplaySavedGames() {
    const result = await listSavedGames();
    const container = document.getElementById('savedGamesList');
    const moreBtn = document.getElementById('savedGamesMoreBtn');

    if (!result.success || result.saves.length === 0) {
        container.innerHTML = '<p class="no-saves">No saved games</p>';
        moreBtn.style.display = 'none';
        return;
    }

    // Store all saves and reset expanded state
    allSavedGames = result.saves;
    savedGamesExpanded = false;

    // Render saved games
    renderSavedGames();
}

function renderSavedGames() {
    const container = document.getElementById('savedGamesList');
    const moreBtn = document.getElementById('savedGamesMoreBtn');

    // Determine which saves to show
    const savesToShow = savedGamesExpanded
        ? allSavedGames
        : allSavedGames.slice(0, SAVED_GAMES_COLLAPSED_COUNT);

    container.innerHTML = savesToShow.map(save => {
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

    // Show/hide More button based on total saves count
    if (allSavedGames.length > SAVED_GAMES_COLLAPSED_COUNT) {
        moreBtn.style.display = 'block';
        moreBtn.textContent = savedGamesExpanded ? 'Show Less' : 'More';
    } else {
        moreBtn.style.display = 'none';
    }
}

function toggleSavedGamesExpanded() {
    savedGamesExpanded = !savedGamesExpanded;
    renderSavedGames();
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

    // Show forgot password form
    document.getElementById('showForgotPassword').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('forgotPasswordForm').style.display = 'block';
        document.getElementById('resetRequestError').textContent = '';
        document.getElementById('resetRequestSuccess').textContent = '';
    });

    // Back to login from forgot password
    document.getElementById('backToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('forgotPasswordForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });

    // Request password reset
    document.getElementById('resetRequestBtn').addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        const errorDiv = document.getElementById('resetRequestError');
        const successDiv = document.getElementById('resetRequestSuccess');

        if (!email) {
            errorDiv.textContent = 'Please enter your email';
            successDiv.textContent = '';
            return;
        }

        errorDiv.textContent = '';
        successDiv.textContent = '';

        const result = await requestPasswordReset(email);

        if (result.success) {
            successDiv.textContent = 'Reset link sent! Check your email.';
        } else {
            errorDiv.textContent = result.error?.message || 'Failed to send reset link';
        }
    });

    // Update password (shown after clicking email link)
    document.getElementById('updatePasswordBtn').addEventListener('click', async () => {
        const newPasswordValue = document.getElementById('newPassword').value;
        const confirmPasswordValue = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('updatePasswordError');

        if (!newPasswordValue || !confirmPasswordValue) {
            errorDiv.textContent = 'Please fill in both fields';
            return;
        }

        if (newPasswordValue.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }

        if (newPasswordValue !== confirmPasswordValue) {
            errorDiv.textContent = 'Passwords do not match';
            return;
        }

        errorDiv.textContent = '';
        const result = await updatePassword(newPasswordValue);

        if (result.success) {
            // Password updated, redirect to start screen or login
            const profile = await getProfile();
            if (profile) {
                applyProfileToGameState(profile);
                showStartScreen(profile);
            } else {
                showAuthScreen();
            }
        } else {
            errorDiv.textContent = result.error?.message || 'Failed to update password';
        }
    });
}

function setupStartScreenHandlers() {
    // Leaderboard button
    document.getElementById('leaderboardBtn').addEventListener('click', () => {
        openLeaderboard();
    });

    // Saved games More/Show Less button
    document.getElementById('savedGamesMoreBtn').addEventListener('click', () => {
        toggleSavedGamesExpanded();
    });

    // Edit nickname button
    document.getElementById('editNicknameBtn').addEventListener('click', () => {
        const currentNickname = document.getElementById('nicknameDisplay').textContent;
        document.getElementById('nicknameInput').value = currentNickname;
        document.getElementById('nicknameError').textContent = '';
        document.getElementById('nicknameEditDialog').style.display = 'flex';
    });

    // Save nickname button
    document.getElementById('saveNicknameBtn').addEventListener('click', async () => {
        const newNickname = document.getElementById('nicknameInput').value.trim();
        const errorDiv = document.getElementById('nicknameError');

        if (!newNickname) {
            errorDiv.textContent = 'Nickname cannot be empty';
            return;
        }

        if (newNickname.length > 20) {
            errorDiv.textContent = 'Nickname must be 20 characters or less';
            return;
        }

        errorDiv.textContent = '';
        const result = await updateProfile({ nickname: newNickname });

        if (result.success) {
            document.getElementById('nicknameDisplay').textContent = newNickname;
            document.getElementById('nicknameEditDialog').style.display = 'none';
        } else {
            errorDiv.textContent = 'Failed to update nickname';
        }
    });

    // Cancel nickname button
    document.getElementById('cancelNicknameBtn').addEventListener('click', () => {
        document.getElementById('nicknameEditDialog').style.display = 'none';
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
        // Reload profile and show start screen if logged in
        if (gameState.userId) {
            getProfile().then(profile => {
                showStartScreen(profile);
            });
        } else {
            showStartScreen(null);
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

    // Load data by difficulty
    const personalBests = tab === 'personal' ? await getPersonalBestByDifficulty() : { easy: null, medium: null, hard: null };
    const globalTop5 = await getGlobalTop5ByDifficulty();

    // Render by difficulty (show personal bests only on personal tab)
    content.innerHTML = renderLeaderboardByDifficulty(personalBests, globalTop5, tab === 'personal');
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
