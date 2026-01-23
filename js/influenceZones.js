// ============================================
// INFLUENCE ZONES - VORONOI DIAGRAMS
// ============================================
//
// This module calculates and renders influence zones using Voronoi diagrams
// to visualize territorial control across the galaxy map.
//
// Version: 1.0.6 - Rewritten for continuous territories
//
// Core Responsibilities:
// - Generate standard Voronoi diagram (equal-sized regions per planet)
// - Create continuous merged territories per empire (like countries)
// - Render semi-transparent colored zones using custom empire colors
// - Support toggle visibility of influence zones
// - Use nearest-neighbor algorithm for territory boundaries
//
// Influence Calculation:
// - One site per owned planet (no weighting)
// - Voronoi cell = all points closer to that planet than any other
// - Territories merge: all player planets form one region, all AI planets form another
// - Neutral planets don't create zones (absorbed by nearest owner)
//
// Exports:
// - calculateInfluenceZones(): Generates Voronoi diagram data
// - renderInfluenceZones(ctx): Draws continuous empire territories
// - toggleInfluenceZones(): Shows/hides influence zone display
//
// Used by: renderer.js (main rendering loop), inputHandler.js (toggle control)

import { gameState, canvas, getPlayerColor, getAIColor } from './gameState.js';
import { camera } from './gameState.js';
import { SHIP_TYPES } from './config.js';

// Influence zones state
export let influenceZonesVisible = true;
let cachedZones = null;
let cacheInvalidated = true;

export function toggleInfluenceZones() {
    influenceZonesVisible = !influenceZonesVisible;
    return influenceZonesVisible;
}

export function invalidateZoneCache() {
    cacheInvalidated = true;
}

// Generate Voronoi diagram for influence zones (standard, equal-sized regions)
export function calculateInfluenceZones() {
    if (cachedZones && !cacheInvalidated) {
        return cachedZones;
    }

    const allPlanets = gameState.planets;
    if (allPlanets.length === 0) {
        cachedZones = { playerSites: [], enemySites: [], neutralSites: [] };
        cacheInvalidated = false;
        return cachedZones;
    }

    // Create one site per planet (owned or neutral, no weighting)
    const playerSites = [];
    const enemySites = [];
    const neutralSites = [];

    for (const planet of allPlanets) {
        const site = {
            x: planet.x,
            y: planet.y,
            owner: planet.owner,
            planet: planet
        };

        if (planet.owner === 'player') {
            playerSites.push(site);
        } else if (planet.owner === 'enemy') {
            enemySites.push(site);
        } else {
            neutralSites.push(site);
        }
    }

    cachedZones = { playerSites, enemySites, neutralSites };
    cacheInvalidated = false;
    return cachedZones;
}

export function renderInfluenceZones(ctx) {
    if (!influenceZonesVisible) return;

    const zones = calculateInfluenceZones();
    if (!zones.playerSites.length && !zones.enemySites.length) return;

    ctx.save();

    // Apply camera transformation
    ctx.translate(-camera.x, -camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Render continuous territories using Voronoi nearest-neighbor algorithm
    renderVoronoiTerritories(ctx, zones);

    ctx.restore();
}

function renderVoronoiTerritories(ctx, zones) {
    const allSites = [...zones.playerSites, ...zones.enemySites, ...zones.neutralSites];
    if (allSites.length === 0) return;

    // Determine rendering bounds (full map)
    const bounds = {
        minX: 0,
        minY: 0,
        maxX: gameState.worldWidth,
        maxY: gameState.worldHeight
    };

    // Create pixel grid to determine territory ownership via nearest-neighbor
    const resolution = 10; // Pixels per sample (lower = more detailed, slower)
    const width = Math.ceil(bounds.maxX / resolution);
    const height = Math.ceil(bounds.maxY / resolution);

    // Build pixel-to-owner map using nearest-neighbor Voronoi
    const ownerMap = new Map();

    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const worldX = px * resolution;
            const worldY = py * resolution;

            // Find nearest planet site
            let nearestDist = Infinity;
            let nearestOwner = null;

            for (const site of allSites) {
                const dx = worldX - site.x;
                const dy = worldY - site.y;
                const dist = dx * dx + dy * dy; // Squared distance (avoid sqrt)

                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestOwner = site.owner;
                }
            }

            if (nearestOwner) {
                ownerMap.set(`${px},${py}`, nearestOwner);
            }
        }
    }

    // Render territories as filled regions
    const playerColor = getPlayerColor();
    const enemyColor = getAIColor();
    const alpha = gameState.influenceTransparency;

    // Draw player territory
    ctx.fillStyle = `rgba(${playerColor.glowRgba}, ${alpha})`;
    ctx.beginPath();
    for (const [key, owner] of ownerMap) {
        if (owner === 'player') {
            const [px, py] = key.split(',').map(Number);
            ctx.rect(px * resolution, py * resolution, resolution, resolution);
        }
    }
    ctx.fill();

    // Draw enemy territory
    ctx.fillStyle = `rgba(${enemyColor.glowRgba}, ${alpha})`;
    ctx.beginPath();
    for (const [key, owner] of ownerMap) {
        if (owner === 'enemy') {
            const [px, py] = key.split(',').map(Number);
            ctx.rect(px * resolution, py * resolution, resolution, resolution);
        }
    }
    ctx.fill();

    // Draw neutral territory (completely transparent - creates holes in colored territories)
    // Neutral planets participate in Voronoi calculation but their zones are invisible
    ctx.fillStyle = `rgba(0, 0, 0, 0)`;
    ctx.beginPath();
    for (const [key, owner] of ownerMap) {
        if (owner === null) {
            const [px, py] = key.split(',').map(Number);
            ctx.rect(px * resolution, py * resolution, resolution, resolution);
        }
    }
    ctx.fill();
}
