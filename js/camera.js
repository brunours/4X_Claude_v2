// ============================================
// CAMERA & COORDINATE TRANSFORMATIONS
// ============================================

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
