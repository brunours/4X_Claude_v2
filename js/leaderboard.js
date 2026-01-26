// ============================================
// LEADERBOARD MODULE
// ============================================
//
// This module handles all leaderboard operations including:
// - Fetching personal best scores
// - Fetching global top scores
// - Getting completed game details for map viewing
//
// Exports:
// - getPersonalTop10() - Get user's best victories
// - getGlobalTop10() - Get global best victories
// - getCompletedGameDetails(gameId) - Fetch full game details for viewing/replay

import { supabase } from './supabaseClient.js';
import { gameState } from './gameState.js';

// Get user's personal top 10 victories
export async function getPersonalTop10() {
    if (!gameState.userId) {
        return [];
    }

    const { data, error } = await supabase
        .rpc('get_personal_leaderboard', { p_user_id: gameState.userId });

    if (error) {
        console.error('Error fetching personal leaderboard:', error);
        return [];
    }

    return data || [];
}

// Get global top 10 victories
export async function getGlobalTop10() {
    const { data, error } = await supabase
        .rpc('get_global_leaderboard');

    if (error) {
        console.error('Error fetching global leaderboard:', error);
        return [];
    }

    return data || [];
}

// Get detailed information about a completed game (for map viewing)
export async function getCompletedGameDetails(gameId) {
    const { data, error } = await supabase
        .from('completed_games')
        .select('*')
        .eq('id', gameId)
        .single();

    if (error) {
        console.error('Error fetching completed game details:', error);
        return null;
    }

    return data;
}

// Format a leaderboard entry for display
export function formatLeaderboardEntry(entry, rank) {
    const difficultyColors = {
        easy: '#0f8',
        medium: '#fc0',
        hard: '#f44'
    };

    const sizeLabels = {
        compact: 'Compact',
        standard: 'Standard',
        vast: 'Vast'
    };

    const difficultyLabels = {
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard'
    };

    return {
        rank,
        username: entry.username,
        score: entry.final_score,
        turn: entry.final_turn,
        mapSize: sizeLabels[entry.map_size] || entry.map_size,
        difficulty: difficultyLabels[entry.difficulty] || entry.difficulty,
        difficultyColor: difficultyColors[entry.difficulty] || '#888',
        planetsOwned: entry.planets_owned,
        completedAt: new Date(entry.completed_at).toLocaleDateString(),
        gameId: entry.id
    };
}

// Render leaderboard entries to HTML
export function renderLeaderboardEntries(entries, isPersonal = false) {
    if (!entries || entries.length === 0) {
        return `<p class="no-saves">${isPersonal ? 'No victories yet! Win a game to appear here.' : 'No entries yet!'}</p>`;
    }

    let html = '';

    entries.forEach((entry, index) => {
        const formatted = formatLeaderboardEntry(entry, index + 1);

        // Rank styling
        let rankClass = '';
        if (formatted.rank === 1) rankClass = 'gold';
        else if (formatted.rank === 2) rankClass = 'silver';
        else if (formatted.rank === 3) rankClass = 'bronze';

        html += `
            <div class="leaderboard-entry" data-game-id="${formatted.gameId}" onclick="window.viewLeaderboardGame('${formatted.gameId}')">
                <div class="leaderboard-rank ${rankClass}">#${formatted.rank}</div>
                <div class="leaderboard-player">
                    <div class="leaderboard-player-name">${escapeHtml(formatted.username)}</div>
                    <div class="leaderboard-player-details">
                        ${formatted.mapSize} |
                        <span style="color: ${formatted.difficultyColor}">${formatted.difficulty}</span> |
                        Turn ${formatted.turn} |
                        ${formatted.completedAt}
                    </div>
                </div>
                <div class="leaderboard-score">${formatted.score.toLocaleString()}</div>
            </div>
        `;
    });

    return html;
}

// HTML escape helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render map viewer info panel
export function renderMapViewerInfo(gameData) {
    const difficultyLabels = {
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard'
    };

    const sizeLabels = {
        compact: 'Compact',
        standard: 'Standard',
        vast: 'Vast'
    };

    return `
        <div class="map-viewer-stat">
            <span class="map-viewer-stat-label">Player</span>
            <span class="map-viewer-stat-value">${escapeHtml(gameData.username)}</span>
        </div>
        <div class="map-viewer-stat">
            <span class="map-viewer-stat-label">Score</span>
            <span class="map-viewer-stat-value">${gameData.final_score.toLocaleString()}</span>
        </div>
        <div class="map-viewer-stat">
            <span class="map-viewer-stat-label">Turn</span>
            <span class="map-viewer-stat-value">${gameData.final_turn}</span>
        </div>
        <div class="map-viewer-stat">
            <span class="map-viewer-stat-label">Map Size</span>
            <span class="map-viewer-stat-value">${sizeLabels[gameData.map_size] || gameData.map_size}</span>
        </div>
        <div class="map-viewer-stat">
            <span class="map-viewer-stat-label">Difficulty</span>
            <span class="map-viewer-stat-value">${difficultyLabels[gameData.difficulty] || gameData.difficulty}</span>
        </div>
        <div class="map-viewer-stat">
            <span class="map-viewer-stat-label">Planets Owned</span>
            <span class="map-viewer-stat-value">${gameData.planets_owned}</span>
        </div>
        <div class="map-viewer-stat">
            <span class="map-viewer-stat-label">Ships Built</span>
            <span class="map-viewer-stat-value">${gameData.ships_built}</span>
        </div>
        <div class="map-viewer-stat">
            <span class="map-viewer-stat-label">Enemy Ships Destroyed</span>
            <span class="map-viewer-stat-value">${gameData.enemy_ships_destroyed}</span>
        </div>
    `;
}

// Draw the map state on a canvas (for map viewer)
export function drawMapPreview(canvas, mapState, playerColor, aiColor) {
    const ctx = canvas.getContext('2d');
    const { worldWidth, worldHeight, planets, influenceTransparency } = mapState;

    // Calculate scale to fit map in canvas
    const scaleX = canvas.width / worldWidth;
    const scaleY = canvas.height / worldHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add margin

    // Center offset
    const offsetX = (canvas.width - worldWidth * scale) / 2;
    const offsetY = (canvas.height - worldHeight * scale) / 2;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Import color options (inline since we can't use dynamic imports easily here)
    const colorOptions = {
        blue: '#0096ff',
        red: '#ff3232',
        purple: '#a855f7',
        green: '#00ff88',
        white: '#ffffff',
        orange: '#ff8800'
    };

    // Draw planets
    for (const planet of planets) {
        const x = offsetX + planet.x * scale;
        const y = offsetY + planet.y * scale;
        const radius = Math.max(planet.size * scale * 0.8, 4);

        // Determine planet color based on owner
        let fillColor = '#444'; // Neutral
        let glowColor = 'rgba(100, 100, 100, 0.3)';

        if (planet.owner === 'player') {
            fillColor = colorOptions[playerColor] || '#0096ff';
            glowColor = fillColor.replace('#', 'rgba(').replace(/([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i, (_, r, g, b) =>
                `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, 0.4)`);
        } else if (planet.owner === 'enemy') {
            fillColor = colorOptions[aiColor] || '#ff3232';
            glowColor = fillColor.replace('#', 'rgba(').replace(/([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i, (_, r, g, b) =>
                `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, 0.4)`);
        }

        // Draw glow
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();

        // Draw planet
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Draw planet name
        ctx.font = `${Math.max(10, 12 * scale)}px "Orbitron", sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(planet.name, x, y + radius + 12);
    }
}
