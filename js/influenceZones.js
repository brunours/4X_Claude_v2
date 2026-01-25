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
// - Voronoi includes ALL planets (owned + neutral) for proper boundary calculation
// - Neutral planets create Voronoi cells that act as barriers/holes
// - Only owned planet cells are rendered with color (neutral cells invisible)
// - Territories merge: all player planets form one region, all AI planets form another
// - Neutral planets block territory expansion (zones stop at neutral boundaries)
// - Borders are equidistant between nearest planets (owned or neutral)
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

    // Only process owned planets - neutral planets are completely excluded
    const ownedPlanets = gameState.planets.filter(p => p.owner !== null);
    if (ownedPlanets.length === 0) {
        cachedZones = { playerSites: [], enemySites: [] };
        cacheInvalidated = false;
        return cachedZones;
    }

    // Create one site per owned planet only
    const playerSites = [];
    const enemySites = [];

    for (const planet of ownedPlanets) {
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
        }
    }

    cachedZones = { playerSites, enemySites };
    cacheInvalidated = false;
    return cachedZones;
}

export function renderInfluenceZones(ctx) {
    if (!influenceZonesVisible) return;

    const zones = calculateInfluenceZones();
    if (!zones.playerSites.length && !zones.enemySites.length) return;

    ctx.save();

    // Apply camera transformation (must match renderer.js order: scale then translate)
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Render continuous territories using Voronoi nearest-neighbor algorithm
    renderVoronoiTerritories(ctx, zones);

    ctx.restore();
}

function renderVoronoiTerritories(ctx, zones) {
    // Include ALL planets in Voronoi calculation (owned + neutral)
    // This ensures neutral planets create boundaries that block territory expansion
    const ownedSites = [...zones.playerSites, ...zones.enemySites];
    const neutralSites = gameState.planets
        .filter(p => p.owner === null)
        .map(p => ({ x: p.x, y: p.y, owner: null, planet: p }));

    const allSites = [...ownedSites, ...neutralSites];
    if (allSites.length === 0) return;

    // Use d3-delaunay for smooth Voronoi polygons
    if (typeof d3 === 'undefined' || !d3.Delaunay) {
        // Fallback to pixel-based rendering if library not loaded
        renderVoronoiFallback(ctx, zones, ownedSites, neutralSites);
        return;
    }

    const playerColor = getPlayerColor();
    const enemyColor = getAIColor();
    const alpha = gameState.influenceTransparency;

    // Prepare points array for Delaunay triangulation
    const points = allSites.map(site => [site.x, site.y]);

    // Create Delaunay triangulation and Voronoi diagram
    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, gameState.worldWidth, gameState.worldHeight]);

    // Render each Voronoi cell - ONLY for owned planets (skip neutral cells)
    for (let i = 0; i < allSites.length; i++) {
        const site = allSites[i];

        // Skip rendering neutral planet cells (they create boundaries but no color)
        if (site.owner === null) continue;

        const polygon = voronoi.cellPolygon(i);
        if (!polygon) continue;

        // Set color based on owner
        if (site.owner === 'player') {
            ctx.fillStyle = `rgba(${playerColor.glowRgba}, ${alpha})`;
        } else if (site.owner === 'enemy') {
            ctx.fillStyle = `rgba(${enemyColor.glowRgba}, ${alpha})`;
        }

        // Draw the smooth polygon
        ctx.beginPath();
        ctx.moveTo(polygon[0][0], polygon[0][1]);
        for (let j = 1; j < polygon.length; j++) {
            ctx.lineTo(polygon[j][0], polygon[j][1]);
        }
        ctx.closePath();
        ctx.fill();
    }
}

// Fallback pixel-based rendering (used if d3-delaunay not available)
function renderVoronoiFallback(ctx, zones, ownedSites, neutralSites) {
    const allSites = [...ownedSites, ...neutralSites];
    const resolution = 5;
    const width = Math.ceil(gameState.worldWidth / resolution);
    const height = Math.ceil(gameState.worldHeight / resolution);

    const ownerMap = new Map();

    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const worldX = px * resolution;
            const worldY = py * resolution;

            let nearestDist = Infinity;
            let nearestOwner = null;

            for (const site of allSites) {
                const dx = worldX - site.x;
                const dy = worldY - site.y;
                const dist = dx * dx + dy * dy;

                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestOwner = site.owner;
                }
            }

            // Only store if it's an owned planet (skip neutral)
            if (nearestOwner !== null) {
                ownerMap.set(`${px},${py}`, nearestOwner);
            }
        }
    }

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
}
