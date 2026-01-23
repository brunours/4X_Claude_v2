// ============================================
// RENDERING
// ============================================
//
// This module handles all canvas rendering for the game, including the game loop,
// background, planets, ships, travel routes, and UI overlays.
//
// Version: 1.0.3 - Added influence zones visualization
//
// Core Responsibilities:
// - Main game loop using requestAnimationFrame for smooth 60fps rendering
// - Draw background gradient and decorative stars
// - Render influence zones using Voronoi diagrams (toggleable)
// - Render all planets with ownership colors, names, and orbital effects
// - Display ship icons and counts at planets
// - Visualize traveling ship groups with animated routes
// - Show destination selection indicators and travel paths
// - Apply camera transformations for pan and zoom
//
// Exports:
// - gameLoop(): Main rendering loop, called continuously by browser
// - render(): Single frame render function that draws entire game state
//
// Used by: main.js (starts the game loop on initialization)

import { gameState, camera, canvas, ctx, backgroundStars } from './gameState.js';
import { SHIP_TYPES } from './config.js';
import { renderInfluenceZones } from './influenceZones.js';

export function gameLoop() {
    render();
    requestAnimationFrame(gameLoop);
}

export function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background gradient
    const bgGrad = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.2, 0,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width
    );
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(0.5, '#050a12');
    bgGrad.addColorStop(1, '#000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Draw stars
    for (const star of backgroundStars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Draw influence zones (before planets, in screen space)
    renderInfluenceZones(ctx);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Draw travel routes
    for (const group of gameState.travelingShips) {
        drawTravelRoute(group);
    }

    // Draw planets
    for (const planet of gameState.planets) {
        drawPlanet(planet);
    }

    // Draw destination indicators
    if (gameState.selectingDestination && gameState.sourcePlanet) {
        for (const planet of gameState.planets) {
            if (planet !== gameState.sourcePlanet) {
                drawDestinationIndicator(planet);
            }
        }
    }

    ctx.restore();
}

function drawPlanet(planet) {
    const x = planet.x;
    const y = planet.y;
    const size = planet.size;

    // Glow effect for owned planets
    if (planet.owner) {
        const glowColor = planet.owner === 'player' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)';
        const glow = ctx.createRadialGradient(x, y, size * 0.5, x, y, size * 2);
        glow.addColorStop(0, glowColor);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Planet body
    const grad = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
    grad.addColorStop(0, planet.color);
    grad.addColorStop(1, shadeColor(planet.color, -40));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Selection ring
    if (gameState.selectedPlanet === planet) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(x, y, size + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Planet name
    ctx.fillStyle = '#fff';
    ctx.font = `${12 / camera.zoom < 8 ? 8 : 12}px 'Exo 2'`;
    ctx.textAlign = 'center';
    ctx.fillText(planet.name, x, y + size + 18);

    // Draw ship indicators (dots on right side)
    if (planet.ships.length > 0) {
        drawShipDots(planet);
    }

    // Draw build queue indicator
    if (planet.buildQueue.length > 0) {
        const item = planet.buildQueue[0];
        const shipType = SHIP_TYPES[item.type];
        ctx.fillStyle = shipType.color;
        ctx.font = 'bold 14px Orbitron';
        ctx.fillText(item.turnsRemaining.toString(), x, y + size + 35);

        if (planet.buildQueue.length > 1) {
            ctx.font = '10px Exo 2';
            ctx.fillStyle = '#888';
            ctx.fillText(`+${planet.buildQueue.length - 1}`, x + 15, y + size + 35);
        }
    }
}

function drawShipDots(planet) {
    const dotSize = 4;
    const dotSpacing = 10;
    const rowSpacing = 12;
    const maxDotsPerRow = 5;

    // Separate ships by owner
    const playerShips = planet.ships.filter(s => s.owner === 'player');
    const enemyShips = planet.ships.filter(s => s.owner === 'enemy');

    // Draw player ships on the RIGHT side
    if (playerShips.length > 0) {
        const playerGroups = {};
        for (const ship of playerShips) {
            if (!playerGroups[ship.type]) playerGroups[ship.type] = 0;
            playerGroups[ship.type]++;
        }

        let rowIndex = 0;
        for (const [type, count] of Object.entries(playerGroups)) {
            const shipType = SHIP_TYPES[type];
            const dotsToShow = Math.min(count, maxDotsPerRow);
            const rowY = planet.y - planet.size / 2 + rowIndex * rowSpacing;

            for (let i = 0; i < dotsToShow; i++) {
                const dotX = planet.x + planet.size + 8 + i * dotSpacing;

                ctx.fillStyle = shipType.color;
                ctx.shadowColor = shipType.color;
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.arc(dotX, rowY, dotSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            if (count > maxDotsPerRow) {
                ctx.fillStyle = shipType.color;
                ctx.font = '10px Exo 2';
                ctx.textAlign = 'left';
                ctx.fillText(`+${count - maxDotsPerRow}`, planet.x + planet.size + 8 + maxDotsPerRow * dotSpacing, rowY + 4);
            }

            rowIndex++;
        }
    }

    // Draw enemy ships on the LEFT side
    if (enemyShips.length > 0) {
        const enemyGroups = {};
        for (const ship of enemyShips) {
            if (!enemyGroups[ship.type]) enemyGroups[ship.type] = 0;
            enemyGroups[ship.type]++;
        }

        let rowIndex = 0;
        for (const [type, count] of Object.entries(enemyGroups)) {
            const shipType = SHIP_TYPES[type];
            const dotsToShow = Math.min(count, maxDotsPerRow);
            const rowY = planet.y - planet.size / 2 + rowIndex * rowSpacing;

            for (let i = 0; i < dotsToShow; i++) {
                const dotX = planet.x - planet.size - 8 - i * dotSpacing;

                ctx.fillStyle = shipType.color;
                ctx.shadowColor = shipType.color;
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.arc(dotX, rowY, dotSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            if (count > maxDotsPerRow) {
                ctx.fillStyle = shipType.color;
                ctx.font = '10px Exo 2';
                ctx.textAlign = 'right';
                ctx.fillText(`+${count - maxDotsPerRow}`, planet.x - planet.size - 8 - maxDotsPerRow * dotSpacing, rowY + 4);
            }

            rowIndex++;
        }
    }
}

function drawTravelRoute(group) {
    const fromPlanet = gameState.planets.find(p => p.id === group.fromPlanetId);
    const toPlanet = gameState.planets.find(p => p.id === group.targetPlanetId);
    if (!fromPlanet || !toPlanet) return;

    const progress = 1 - (group.turnsRemaining / group.totalTurns);
    const currentX = fromPlanet.x + (toPlanet.x - fromPlanet.x) * progress;
    const currentY = fromPlanet.y + (toPlanet.y - fromPlanet.y) * progress;

    // Get ship type color (use first ship's type)
    const shipType = group.ships.length > 0 ? group.ships[0].type : 'scout';
    const color = SHIP_TYPES[shipType].color;

    // Dotted line from start to destination (full route)
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(fromPlanet.x, fromPlanet.y);
    ctx.lineTo(toPlanet.x, toPlanet.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ship position (moving dot)
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ship count inside the dot
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px Exo 2';
    ctx.textAlign = 'center';
    ctx.fillText(group.ships.length.toString(), currentX, currentY + 4);

    // ETA below the ship
    ctx.fillStyle = color;
    ctx.font = 'bold 12px Orbitron';
    ctx.fillText(group.turnsRemaining.toString(), currentX, currentY + 22);
}

function drawDestinationIndicator(planet) {
    const atmosphereGrad = ctx.createRadialGradient(
        planet.x, planet.y, planet.size,
        planet.x, planet.y, planet.size + 30
    );
    atmosphereGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
    atmosphereGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.3)');
    atmosphereGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

    ctx.fillStyle = atmosphereGrad;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.size + 30, 0, Math.PI * 2);
    ctx.fill();
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}
