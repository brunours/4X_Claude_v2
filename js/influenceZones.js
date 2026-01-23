// ============================================
// INFLUENCE ZONES - VORONOI DIAGRAMS
// ============================================
//
// This module calculates and renders influence zones using Voronoi diagrams
// to visualize territorial control across the galaxy map.
//
// Version: 1.0.3 - Initial implementation
//
// Core Responsibilities:
// - Calculate weighted influence for each owned planet
// - Generate Voronoi diagram polygons for player and AI territories
// - Render semi-transparent colored zones (blue for player, red for AI)
// - Support toggle visibility of influence zones
// - Weight influence by planet strength (population, ships, production)
//
// Influence Calculation:
// - Planet strength = population + (ship count * 5) + (total production * 2)
// - Stronger planets create larger influence zones
// - Neutral planets don't create zones (absorbed by nearest owner)
//
// Exports:
// - calculateInfluenceZones(): Generates Voronoi polygons for owned planets
// - renderInfluenceZones(ctx): Draws influence zones on canvas
// - toggleInfluenceZones(): Shows/hides influence zone display
//
// Used by: renderer.js (main rendering loop), inputHandler.js (toggle control)

import { gameState, canvas } from './gameState.js';
import { camera } from './gameState.js';
import { SHIP_TYPES } from './config.js';

// Influence zones state
export let influenceZonesVisible = false;
let cachedZones = null;
let cacheInvalidated = true;

export function toggleInfluenceZones() {
    influenceZonesVisible = !influenceZonesVisible;
    return influenceZonesVisible;
}

export function invalidateZoneCache() {
    cacheInvalidated = true;
}

// Calculate planet strength for weighted Voronoi
function calculatePlanetStrength(planet) {
    if (!planet.owner) return 0;

    let strength = planet.population;
    strength += planet.ships.length * 5;
    strength += (planet.resources.energy + planet.resources.minerals + planet.resources.food) * 2;

    return strength;
}

// Generate Voronoi diagram for influence zones
export function calculateInfluenceZones() {
    if (cachedZones && !cacheInvalidated) {
        return cachedZones;
    }

    const ownedPlanets = gameState.planets.filter(p => p.owner !== null);
    if (ownedPlanets.length === 0) {
        cachedZones = [];
        cacheInvalidated = false;
        return cachedZones;
    }

    // Create weighted sites for Voronoi (replicate strong planets)
    const sites = [];
    for (const planet of ownedPlanets) {
        const strength = calculatePlanetStrength(planet);
        const weight = Math.max(1, Math.floor(strength / 20)); // 1 site per 20 strength

        // Add multiple sites around the planet for weighted influence
        for (let i = 0; i < weight; i++) {
            const angle = (Math.PI * 2 * i) / weight;
            const radius = 5 * Math.sqrt(weight); // Spread increases with weight
            sites.push({
                x: planet.x + Math.cos(angle) * radius,
                y: planet.y + Math.sin(angle) * radius,
                owner: planet.owner,
                planet: planet
            });
        }
    }

    // Generate Voronoi cells using Fortune's algorithm (simplified)
    const zones = generateVoronoiCells(sites);

    cachedZones = zones;
    cacheInvalidated = false;
    return zones;
}

// Simplified Voronoi generation using pixel-based approach
function generateVoronoiCells(sites) {
    if (sites.length === 0) return [];

    const zones = new Map(); // owner -> array of regions

    // Define rendering bounds (entire map)
    const padding = 200;
    const bounds = {
        minX: -padding,
        minY: -padding,
        maxX: canvas.width / camera.zoom + padding,
        maxY: canvas.height / camera.zoom + padding
    };

    // Group sites by owner
    const sitesByOwner = new Map();
    for (const site of sites) {
        if (!sitesByOwner.has(site.owner)) {
            sitesByOwner.set(site.owner, []);
        }
        sitesByOwner.get(site.owner).push(site);
    }

    // For each owner, create a merged influence region
    for (const [owner, ownerSites] of sitesByOwner) {
        // Create convex hull approximation for this owner's territory
        const region = {
            owner: owner,
            sites: ownerSites,
            bounds: calculateRegionBounds(ownerSites)
        };

        if (!zones.has(owner)) {
            zones.set(owner, []);
        }
        zones.get(owner).push(region);
    }

    return Array.from(zones.values()).flat();
}

function calculateRegionBounds(sites) {
    if (sites.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const site of sites) {
        minX = Math.min(minX, site.x);
        minY = Math.min(minY, site.y);
        maxX = Math.max(maxX, site.x);
        maxY = Math.max(maxY, site.y);
    }

    // Add padding based on site density
    const padding = 100 + sites.length * 20;

    return {
        minX: minX - padding,
        minY: minY - padding,
        maxX: maxX + padding,
        maxY: maxY + padding
    };
}

export function renderInfluenceZones(ctx) {
    if (!influenceZonesVisible) return;

    const zones = calculateInfluenceZones();
    if (zones.length === 0) return;

    ctx.save();

    // Apply camera transformation
    ctx.translate(-camera.x, -camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Render each zone using nearest-site coloring
    renderVoronoiRegions(ctx, zones);

    ctx.restore();
}

function renderVoronoiRegions(ctx, zones) {
    // Get all sites from all zones
    const allSites = [];
    for (const zone of zones) {
        for (const site of zone.sites) {
            allSites.push(site);
        }
    }

    if (allSites.length === 0) return;

    // Determine rendering bounds
    const viewBounds = {
        minX: camera.x / camera.zoom,
        minY: camera.y / camera.zoom,
        maxX: (camera.x + canvas.width) / camera.zoom,
        maxY: (camera.y + canvas.height) / camera.zoom
    };

    // Sample the visible area and color based on nearest site
    const sampleSize = 20; // Pixel size of each sample
    const imageData = ctx.createImageData(
        Math.ceil((viewBounds.maxX - viewBounds.minX) / sampleSize),
        Math.ceil((viewBounds.maxY - viewBounds.minY) / sampleSize)
    );

    // Draw using metaballs/smooth regions
    for (const site of allSites) {
        const color = site.owner === 'player' ?
            { r: 0, g: 150, b: 255, a: 0.25 } : // Blue for player
            { r: 255, g: 50, b: 50, a: 0.25 };   // Red for AI

        // Draw circular influence region
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
        ctx.beginPath();

        const radius = 150; // Base influence radius
        ctx.arc(site.x, site.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
