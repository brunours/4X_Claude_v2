// ============================================
// GAME STATE & INITIALIZATION
// ============================================
//
// This module manages the central game state and handles game initialization,
// including planet generation, canvas setup, and start screen configuration.
//
// Core Responsibilities:
// - Maintains the gameState object (turn counter, planets, ships, players, resources)
// - Manages camera viewport and background stars
// - Generates random galaxy with planets and resource distributions
// - Handles canvas resizing and coordinate system setup
// - Processes start screen options (difficulty, map size)
// - Calculates player scores based on planets, population, ships, and combat
//
// Exports:
// - gameState: Central mutable state object accessed by all modules
// - camera: Viewport position and zoom level
// - backgroundStars: Decorative star positions for rendering
// - Functions: init(), startGame(), generatePlanets(), calculateScore(), generateId()
//
// Used by: All game modules that need to read or modify game state

import { MAP_SIZES, SHIP_TYPES } from './config.js';
import { invalidateZoneCache } from './influenceZones.js';
import { SeededRandom, generateMapSeed } from './seededRandom.js';

// Color palette configuration
export const COLOR_OPTIONS = {
    blue: { name: 'Blue', hex: '#0096ff', glowRgba: '0, 150, 255', planetGlow: 'rgba(0, 255, 136, 0.3)' },
    red: { name: 'Red', hex: '#ff3232', glowRgba: '255, 50, 50', planetGlow: 'rgba(255, 68, 68, 0.3)' },
    purple: { name: 'Purple', hex: '#a855f7', glowRgba: '168, 85, 247', planetGlow: 'rgba(168, 85, 247, 0.3)' },
    green: { name: 'Green', hex: '#00ff88', glowRgba: '0, 255, 136', planetGlow: 'rgba(0, 255, 136, 0.3)' },
    white: { name: 'White', hex: '#ffffff', glowRgba: '255, 255, 255', planetGlow: 'rgba(255, 255, 255, 0.3)' },
    orange: { name: 'Orange', hex: '#ff8800', glowRgba: '255, 136, 0', planetGlow: 'rgba(255, 136, 0, 0.3)' }
};

// Game state object
export let gameState = {
    turn: 1,
    mapSize: 'compact',
    difficulty: 'easy',
    playerColor: 'blue', // Empire color choice
    aiColor: 'red', // AI color choice
    influenceTransparency: 0.10, // 0.02 to 0.25 (default: 10%)
    worldWidth: 1500,
    worldHeight: 1200,
    planets: [],
    travelingShips: [],
    pendingConquests: [], // Track planets being conquered
    players: {
        player: { energy: 100, minerals: 100, food: 100, score: 0, shipsBuilt: 0, enemyShipsDestroyed: 0 },
        enemy: { energy: 100, minerals: 100, food: 100, score: 0, shipsBuilt: 0, enemyShipsDestroyed: 0 }
    },
    selectedPlanet: null,
    selectingDestination: false,
    shipsToSend: null,
    sourcePlanet: null,
    selectedShipIds: new Set(), // Track individually selected ships
    battlePending: null, // Track pending battle for fight/withdraw choice
    fleetTab: 'stationed', // Current fleet tab
    gameOver: false, // Track if game has ended
    // New fields for Supabase integration
    mapSeed: null, // Seed for reproducible map generation
    currentSaveId: null, // UUID of active save (null for new/guest games)
    userId: null, // Current authenticated user ID (null for guests)
    username: null // Current authenticated username
};

// Seeded random instance for current game
let gameRandom = null;

// Camera/viewport
export let camera = {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.25,
    maxZoom: 4,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    pinchStartDist: 0,
    pinchStartZoom: 1
};

export let canvas, ctx;
export let backgroundStars = [];

// ============================================
// INITIALIZATION
// ============================================

export function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setupStartScreen();
    generateBackgroundStars();
}

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Update min zoom to see whole map
    const minZoomX = canvas.width / gameState.worldWidth;
    const minZoomY = canvas.height / gameState.worldHeight;
    camera.minZoom = Math.min(minZoomX, minZoomY, 0.25);
}

export function setupStartScreen() {
    // Load saved settings
    loadSettings();

    // Size buttons
    document.querySelectorAll('[data-size]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-size]').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            gameState.mapSize = btn.dataset.size;
        });
    });

    // Difficulty buttons
    document.querySelectorAll('[data-difficulty]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-difficulty]').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            gameState.difficulty = btn.dataset.difficulty;
        });
    });

    // Player color picker
    const playerColorPicker = document.getElementById('playerColorPicker');
    playerColorPicker.querySelectorAll('.color-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const color = tile.dataset.color;
            if (!tile.classList.contains('disabled')) {
                gameState.playerColor = color;
                updateColorPickers();
            }
        });
    });

    // AI color picker
    const aiColorPicker = document.getElementById('aiColorPicker');
    aiColorPicker.querySelectorAll('.color-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const color = tile.dataset.color;
            if (!tile.classList.contains('disabled')) {
                gameState.aiColor = color;
                updateColorPickers();
            }
        });
    });

    // Transparency slider
    const transparencySlider = document.getElementById('transparencySlider');
    const transparencyValue = document.getElementById('transparencyValue');
    transparencySlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        gameState.influenceTransparency = value / 100;
        transparencyValue.textContent = `${value}%`;
    });

    // Initialize UI with saved settings
    updateColorPickers();
    transparencySlider.value = Math.round(gameState.influenceTransparency * 100);
    transparencyValue.textContent = `${Math.round(gameState.influenceTransparency * 100)}%`;

    // Start button
    document.getElementById('startBtn').addEventListener('click', startGame);
}

function updateColorPickers() {
    // Update player color picker
    const playerColorPicker = document.getElementById('playerColorPicker');
    playerColorPicker.querySelectorAll('.color-tile').forEach(tile => {
        const color = tile.dataset.color;
        tile.classList.remove('selected', 'disabled');
        if (color === gameState.playerColor) {
            tile.classList.add('selected');
        }
        if (color === gameState.aiColor) {
            tile.classList.add('disabled');
        }
    });

    // Update AI color picker
    const aiColorPicker = document.getElementById('aiColorPicker');
    aiColorPicker.querySelectorAll('.color-tile').forEach(tile => {
        const color = tile.dataset.color;
        tile.classList.remove('selected', 'disabled');
        if (color === gameState.aiColor) {
            tile.classList.add('selected');
        }
        if (color === gameState.playerColor) {
            tile.classList.add('disabled');
        }
    });
}

export function startGame(providedSeed = null) {
    // Save settings before starting
    saveSettings();

    // Ensure canvas has correct dimensions before calculating anything
    resizeCanvas();

    // Generate or use provided map seed
    gameState.mapSeed = providedSeed || generateMapSeed();
    gameRandom = new SeededRandom(gameState.mapSeed);

    // Reset save ID for new games (unless loading a saved game)
    if (!providedSeed) {
        gameState.currentSaveId = null;
    }

    // Reset game state for new game
    gameState.turn = 1;
    gameState.travelingShips = [];
    gameState.pendingConquests = [];
    gameState.players = {
        player: { energy: 100, minerals: 100, food: 100, score: 0, shipsBuilt: 0, enemyShipsDestroyed: 0 },
        enemy: { energy: 100, minerals: 100, food: 100, score: 0, shipsBuilt: 0, enemyShipsDestroyed: 0 }
    };
    gameState.selectedPlanet = null;
    gameState.selectingDestination = false;
    gameState.shipsToSend = null;
    gameState.sourcePlanet = null;
    gameState.selectedShipIds = new Set();
    gameState.battlePending = null;
    gameState.fleetTab = 'stationed';

    const sizeConfig = MAP_SIZES[gameState.mapSize];
    gameState.worldWidth = sizeConfig.width;
    gameState.worldHeight = sizeConfig.height;

    // Reset camera
    camera.minZoom = Math.min(canvas.width / gameState.worldWidth, canvas.height / gameState.worldHeight);
    camera.zoom = 1;
    camera.x = gameState.worldWidth / 2 - canvas.width / 2;
    camera.y = gameState.worldHeight / 2 - canvas.height / 2;

    generatePlanets(sizeConfig.planets);
    generateBackgroundStars();

    // Initialize influence zones for immediate display
    invalidateZoneCache();

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('ui').style.display = 'flex';
    document.getElementById('zoomIndicator').style.display = 'block';
}

export function generatePlanets(count) {
    gameState.planets = [];
    const padding = 150;
    const minDistance = 200;

    const planetNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
        'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon',
        'Phi', 'Chi', 'Psi', 'Omega', 'Nova', 'Nebula', 'Pulsar', 'Quasar', 'Vega', 'Rigel'];

    for (let i = 0; i < count; i++) {
        let x, y, valid;
        let attempts = 0;

        do {
            // Use seeded random for reproducible maps
            x = padding + gameRandom.random() * (gameState.worldWidth - padding * 2);
            y = padding + gameRandom.random() * (gameState.worldHeight - padding * 2);
            valid = true;

            for (const planet of gameState.planets) {
                const dist = Math.sqrt((x - planet.x) ** 2 + (y - planet.y) ** 2);
                if (dist < minDistance) {
                    valid = false;
                    break;
                }
            }
            attempts++;
        } while (!valid && attempts < 100);

        const size = 20 + gameRandom.random() * 25;
        const planet = {
            id: i,
            name: planetNames[i] || `Planet-${i}`,
            x, y, size,
            owner: null,
            population: 0,
            maxPopulation: Math.floor(size * 4),
            resources: {
                energy: Math.floor(gameRandom.random() * 10) + 5,
                minerals: Math.floor(gameRandom.random() * 10) + 5,
                food: Math.floor(gameRandom.random() * 10) + 5
            },
            ships: [],
            buildQueue: [],
            color: `hsl(${gameRandom.random() * 360}, 60%, 50%)`
        };

        gameState.planets.push(planet);
    }

    // Assign starting planets - player and enemy get equal start
    const playerStart = gameState.planets[0];
    playerStart.owner = 'player';
    playerStart.population = 50;
    playerStart.ships = [
        { type: 'scout', id: generateId(), hitPoints: SHIP_TYPES.scout.maxHitPoints, maxHitPoints: SHIP_TYPES.scout.maxHitPoints, owner: 'player' },
        { type: 'scout', id: generateId(), hitPoints: SHIP_TYPES.scout.maxHitPoints, maxHitPoints: SHIP_TYPES.scout.maxHitPoints, owner: 'player' },
        { type: 'frigate', id: generateId(), hitPoints: SHIP_TYPES.frigate.maxHitPoints, maxHitPoints: SHIP_TYPES.frigate.maxHitPoints, owner: 'player' }
    ];

    // Enemy starts on opposite side
    const enemyStart = gameState.planets[gameState.planets.length - 1];
    enemyStart.owner = 'enemy';
    enemyStart.population = 50;
    enemyStart.ships = [
        { type: 'scout', id: generateId(), hitPoints: SHIP_TYPES.scout.maxHitPoints, maxHitPoints: SHIP_TYPES.scout.maxHitPoints, owner: 'enemy' },
        { type: 'scout', id: generateId(), hitPoints: SHIP_TYPES.scout.maxHitPoints, maxHitPoints: SHIP_TYPES.scout.maxHitPoints, owner: 'enemy' },
        { type: 'frigate', id: generateId(), hitPoints: SHIP_TYPES.frigate.maxHitPoints, maxHitPoints: SHIP_TYPES.frigate.maxHitPoints, owner: 'enemy' }
    ];

    // Center camera on player's starting planet
    camera.x = playerStart.x - canvas.width / 2;
    camera.y = playerStart.y - canvas.height / 2;
}

export function generateBackgroundStars() {
    backgroundStars = [];
    // Use Math.random for background stars (decorative only, don't need to be reproducible)
    for (let i = 0; i < 500; i++) {
        backgroundStars.push({
            x: Math.random() * gameState.worldWidth,
            y: Math.random() * gameState.worldHeight,
            size: Math.random() * 2,
            brightness: 0.3 + Math.random() * 0.7
        });
    }
}

export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

export function calculateScore(owner) {
    const ownedPlanets = gameState.planets.filter(p => p.owner === owner);
    const totalPopulation = ownedPlanets.reduce((sum, p) => sum + p.population, 0);

    // Count ships: stationed + traveling
    const stationedShips = ownedPlanets.reduce((sum, p) =>
        sum + p.ships.filter(s => s.owner === owner).length, 0
    );
    const travelingShips = gameState.travelingShips
        .filter(g => g.owner === owner)
        .reduce((sum, g) => sum + g.ships.length, 0);
    const totalShips = stationedShips + travelingShips;

    const player = gameState.players[owner];

    // Score formula:
    // - 100 points per planet
    // - 1 point per population
    // - 10 points per ship in service
    // - 20 points per enemy ship destroyed
    const score = (ownedPlanets.length * 100) +
                  totalPopulation +
                  (totalShips * 10) +
                  (player.enemyShipsDestroyed * 20);

    return score;
}

// Helper functions for color management
export function getPlayerColor() {
    return COLOR_OPTIONS[gameState.playerColor];
}

export function getAIColor() {
    return COLOR_OPTIONS[gameState.aiColor];
}

export function getOwnerColor(owner) {
    if (owner === 'player') return getPlayerColor();
    if (owner === 'enemy') return getAIColor();
    return null;
}

// Settings persistence
export function saveSettings() {
    const settings = {
        playerColor: gameState.playerColor,
        aiColor: gameState.aiColor,
        influenceTransparency: gameState.influenceTransparency
    };
    localStorage.setItem('4xSpaceSettings', JSON.stringify(settings));
}

export function loadSettings() {
    const saved = localStorage.getItem('4xSpaceSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            gameState.playerColor = settings.playerColor || 'blue';
            gameState.aiColor = settings.aiColor || 'red';
            gameState.influenceTransparency = settings.influenceTransparency || 0.25;
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }
}

// ============================================
// SERIALIZATION FOR SAVE/LOAD
// ============================================

// Serialize game state for saving to Supabase
export function serializeGameState() {
    return {
        turn: gameState.turn,
        mapSize: gameState.mapSize,
        difficulty: gameState.difficulty,
        playerColor: gameState.playerColor,
        aiColor: gameState.aiColor,
        influenceTransparency: gameState.influenceTransparency,
        worldWidth: gameState.worldWidth,
        worldHeight: gameState.worldHeight,
        mapSeed: gameState.mapSeed,
        planets: gameState.planets.map(p => ({
            ...p,
            ships: [...p.ships],
            buildQueue: [...p.buildQueue]
        })),
        travelingShips: gameState.travelingShips.map(g => ({
            ...g,
            ships: [...g.ships]
        })),
        pendingConquests: [...gameState.pendingConquests],
        players: {
            player: { ...gameState.players.player },
            enemy: { ...gameState.players.enemy }
        },
        // Convert Set to Array for JSON serialization
        selectedShipIds: Array.from(gameState.selectedShipIds),
        selectedPlanetId: gameState.selectedPlanet?.id ?? null,
        fleetTab: gameState.fleetTab
    };
}

// Deserialize game state from Supabase save
export function deserializeGameState(data) {
    gameState.turn = data.turn;
    gameState.mapSize = data.mapSize;
    gameState.difficulty = data.difficulty;
    gameState.playerColor = data.playerColor;
    gameState.aiColor = data.aiColor;
    gameState.influenceTransparency = data.influenceTransparency;
    gameState.worldWidth = data.worldWidth;
    gameState.worldHeight = data.worldHeight;
    gameState.mapSeed = data.mapSeed;
    gameState.planets = data.planets;
    gameState.travelingShips = data.travelingShips;
    gameState.pendingConquests = data.pendingConquests;
    gameState.players = data.players;
    gameState.selectedShipIds = new Set(data.selectedShipIds || []);
    gameState.selectedPlanet = data.selectedPlanetId !== null
        ? gameState.planets.find(p => p.id === data.selectedPlanetId)
        : null;
    gameState.fleetTab = data.fleetTab || 'stationed';
    gameState.selectingDestination = false;
    gameState.shipsToSend = null;
    gameState.sourcePlanet = null;
    gameState.battlePending = null;

    // Reinitialize seeded random (not needed for loaded games, but good for consistency)
    gameRandom = new SeededRandom(gameState.mapSeed);
}

// Get a minimal map state for completed game records (leaderboard viewing)
export function getMinimalMapState() {
    return {
        mapSeed: gameState.mapSeed,
        mapSize: gameState.mapSize,
        worldWidth: gameState.worldWidth,
        worldHeight: gameState.worldHeight,
        planets: gameState.planets.map(p => ({
            id: p.id,
            name: p.name,
            x: p.x,
            y: p.y,
            size: p.size,
            owner: p.owner,
            population: p.population,
            maxPopulation: p.maxPopulation,
            color: p.color,
            shipCount: p.ships.length
        })),
        playerColor: gameState.playerColor,
        aiColor: gameState.aiColor,
        influenceTransparency: gameState.influenceTransparency
    };
}

// Restart game with the same map seed (replay feature)
export function restartWithSameSeed() {
    const currentSeed = gameState.mapSeed;
    const currentMapSize = gameState.mapSize;
    const currentDifficulty = gameState.difficulty;

    // Reset game state but keep the seed
    gameState.mapSize = currentMapSize;
    gameState.difficulty = currentDifficulty;

    // Start game with the same seed
    startGame(currentSeed);
}

// Start game from a completed game's map state (replay from leaderboard)
export function startGameFromMapState(mapState) {
    gameState.mapSize = mapState.mapSize;
    gameState.playerColor = mapState.playerColor;
    gameState.aiColor = mapState.aiColor;
    gameState.influenceTransparency = mapState.influenceTransparency;

    startGame(mapState.mapSeed);
}

// Set user info after authentication
export function setUserInfo(userId, username) {
    gameState.userId = userId;
    gameState.username = username;
}

// Clear user info on logout
export function clearUserInfo() {
    gameState.userId = null;
    gameState.username = null;
    gameState.currentSaveId = null;
}

// Set map seed for replay from leaderboard
export function setMapSeed(seed) {
    gameState.mapSeed = seed;
}

// Reset game state (for returning to main menu)
export function resetGameState() {
    gameState.turn = 1;
    gameState.planets = [];
    gameState.travelingShips = [];
    gameState.pendingConquests = [];
    gameState.players = {
        player: { energy: 100, minerals: 100, food: 100, score: 0, shipsBuilt: 0, enemyShipsDestroyed: 0 },
        enemy: { energy: 100, minerals: 100, food: 100, score: 0, shipsBuilt: 0, enemyShipsDestroyed: 0 }
    };
    gameState.selectedPlanet = null;
    gameState.selectingDestination = false;
    gameState.shipsToSend = null;
    gameState.sourcePlanet = null;
    gameState.selectedShipIds = new Set();
    gameState.battlePending = null;
    gameState.fleetTab = 'stationed';
    gameState.mapSeed = null;
    gameState.currentSaveId = null;
    gameState.gameOver = false;
}
