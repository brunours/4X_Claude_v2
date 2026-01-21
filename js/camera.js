// ============================================
// CAMERA & COORDINATE TRANSFORMATIONS
// ============================================
//
// This module provides utility functions for camera control and coordinate
// system transformations between screen space and world space.
//
// Core Responsibilities:
// - Convert screen coordinates (mouse/touch) to world coordinates (game map)
// - Convert world coordinates to screen coordinates (for rendering)
// - Constrain camera position to prevent panning beyond map boundaries
// - Update zoom indicator display in the UI
//
// Exports:
// - screenToWorld(x, y): Converts mouse/touch position to game world position
// - worldToScreen(x, y): Converts game world position to canvas pixel position
// - clampCamera(): Keeps camera within world bounds with padding
// - updateZoomIndicator(): Updates the zoom percentage display
//
// Used by: inputHandler (mouse/touch events), renderer (drawing positions)

import { gameState, camera, canvas } from './gameState.js';

export function clampCamera() {
    const viewWidth = canvas.width / camera.zoom;
    const viewHeight = canvas.height / camera.zoom;

    camera.x = Math.max(-viewWidth * 0.2, Math.min(gameState.worldWidth - viewWidth * 0.8, camera.x));
    camera.y = Math.max(-viewHeight * 0.2, Math.min(gameState.worldHeight - viewHeight * 0.8, camera.y));
}

export function updateZoomIndicator() {
    document.getElementById('zoomIndicator').textContent = `Zoom: ${Math.round(camera.zoom * 100)}%`;
}

export function screenToWorld(screenX, screenY) {
    return {
        x: camera.x + screenX / camera.zoom,
        y: camera.y + screenY / camera.zoom
    };
}

export function worldToScreen(worldX, worldY) {
    return {
        x: (worldX - camera.x) * camera.zoom,
        y: (worldY - camera.y) * camera.zoom
    };
}

export function getPlanetAt(worldX, worldY) {
    for (const planet of gameState.planets) {
        const dist = Math.sqrt((worldX - planet.x) ** 2 + (worldY - planet.y) ** 2);
        if (dist < planet.size + 10) {
            return planet;
        }
    }
    return null;
}
