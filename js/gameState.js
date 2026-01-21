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

// Game state object
export let gameState = {
    turn: 1,
    mapSize: 'compact',
    difficulty: 'easy',
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
    fleetTab: 'stationed' // Current fleet tab
};

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

    // Start button
    document.getElementById('startBtn').addEventListener('click', startGame);
}

export function startGame() {
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

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('zoomIndicator').style.display = 'block';
    document.getElementById('actionButtons').style.display = 'flex';
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
            x = padding + Math.random() * (gameState.worldWidth - padding * 2);
            y = padding + Math.random() * (gameState.worldHeight - padding * 2);
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

        const size = 20 + Math.random() * 25;
        const planet = {
            id: i,
            name: planetNames[i] || `Planet-${i}`,
            x, y, size,
            owner: null,
            population: 0,
            maxPopulation: Math.floor(size * 4),
            resources: {
                energy: Math.floor(Math.random() * 10) + 5,
                minerals: Math.floor(Math.random() * 10) + 5,
                food: Math.floor(Math.random() * 10) + 5
            },
            ships: [],
            buildQueue: [],
            color: `hsl(${Math.random() * 360}, 60%, 50%)`
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
