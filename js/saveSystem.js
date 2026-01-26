// ============================================
// SAVE SYSTEM MODULE
// ============================================
//
// This module handles all game save/load operations including:
// - Auto-saving game state after each turn
// - Loading saved games
// - Deleting saves
// - Moving completed games to leaderboard
//
// Exports:
// - autoSaveGame() - Upsert current game state to saved_games
// - loadSavedGame(saveId) - Restore full game state
// - deleteSavedGame(saveId) - Remove a save
// - listSavedGames() - Get user's saves for menu
// - completeGame(victory) - Move to completed_games, delete save

import { supabase } from './supabaseClient.js';
import { gameState, serializeGameState, deserializeGameState, getMinimalMapState, calculateScore } from './gameState.js';

// Auto-save the current game state
// Called after each turn ends (for authenticated users only)
export async function autoSaveGame() {
    // Don't save if user is not authenticated
    if (!gameState.userId) {
        return { success: false, error: 'Not authenticated' };
    }

    // Don't save if game is over
    if (gameState.gameOver) {
        return { success: false, error: 'Game is over' };
    }

    const serializedState = serializeGameState();

    const saveData = {
        user_id: gameState.userId,
        map_seed: gameState.mapSeed,
        map_size: gameState.mapSize,
        difficulty: gameState.difficulty,
        player_color: gameState.playerColor,
        ai_color: gameState.aiColor,
        current_turn: gameState.turn,
        player_score: calculateScore('player'),
        player_planets: countPlanets('player'),
        enemy_planets: countPlanets('enemy'),
        game_state: serializedState,
        updated_at: new Date().toISOString()
    };

    let result;

    if (gameState.currentSaveId) {
        // Update existing save
        const { data, error } = await supabase
            .from('saved_games')
            .update(saveData)
            .eq('id', gameState.currentSaveId)
            .eq('user_id', gameState.userId)
            .select()
            .single();

        result = { data, error };
    } else {
        // Create new save
        const { data, error } = await supabase
            .from('saved_games')
            .insert(saveData)
            .select()
            .single();

        if (data) {
            gameState.currentSaveId = data.id;
        }
        result = { data, error };
    }

    if (result.error) {
        console.error('Error saving game:', result.error);
        return { success: false, error: result.error };
    }

    return { success: true, saveId: result.data.id };
}

// Count planets owned by a specific owner
function countPlanets(owner) {
    return gameState.planets.filter(p => p.owner === owner).length;
}

// Load a saved game by ID
export async function loadSavedGame(saveId) {
    if (!gameState.userId) {
        return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
        .from('saved_games')
        .select('*')
        .eq('id', saveId)
        .eq('user_id', gameState.userId)
        .single();

    if (error) {
        console.error('Error loading saved game:', error);
        return { success: false, error };
    }

    if (!data) {
        return { success: false, error: 'Save not found' };
    }

    // Restore the game state
    deserializeGameState(data.game_state);
    gameState.currentSaveId = data.id;

    return { success: true, data };
}

// Delete a saved game by ID
export async function deleteSavedGame(saveId) {
    if (!gameState.userId) {
        return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
        .from('saved_games')
        .delete()
        .eq('id', saveId)
        .eq('user_id', gameState.userId);

    if (error) {
        console.error('Error deleting saved game:', error);
        return { success: false, error };
    }

    // If we deleted the current save, clear the reference
    if (gameState.currentSaveId === saveId) {
        gameState.currentSaveId = null;
    }

    return { success: true };
}

// List all saved games for the current user
export async function listSavedGames() {
    if (!gameState.userId) {
        return { success: false, saves: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
        .from('saved_games')
        .select('id, map_seed, map_size, difficulty, player_color, ai_color, current_turn, player_score, player_planets, enemy_planets, created_at, updated_at')
        .eq('user_id', gameState.userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error listing saved games:', error);
        return { success: false, saves: [], error };
    }

    return { success: true, saves: data || [] };
}

// Complete a game (victory or defeat)
// Moves game to completed_games table and deletes the save
export async function completeGame(victory) {
    // Only save to leaderboard for authenticated users who won
    if (!gameState.userId) {
        return { success: false, error: 'Not authenticated' };
    }

    // Calculate final statistics
    const finalStats = calculateFinalStats();

    // Only save victories to leaderboard (per user requirement)
    if (victory) {
        const completedData = {
            user_id: gameState.userId,
            username: gameState.username,
            map_seed: gameState.mapSeed,
            map_size: gameState.mapSize,
            difficulty: gameState.difficulty,
            player_color: gameState.playerColor,
            ai_color: gameState.aiColor,
            influence_transparency: gameState.influenceTransparency,
            final_score: calculateScore('player'),
            final_turn: gameState.turn,
            victory: victory,
            planets_owned: finalStats.planetsOwned,
            ships_built: finalStats.shipsBuilt,
            enemy_ships_destroyed: finalStats.enemyShipsDestroyed,
            final_map_state: getMinimalMapState()
        };

        const { error: insertError } = await supabase
            .from('completed_games')
            .insert(completedData);

        if (insertError) {
            console.error('Error saving completed game:', insertError);
            // Continue to delete save even if leaderboard insert fails
        }
    }

    // Delete the saved game
    if (gameState.currentSaveId) {
        const { error: deleteError } = await supabase
            .from('saved_games')
            .delete()
            .eq('id', gameState.currentSaveId)
            .eq('user_id', gameState.userId);

        if (deleteError) {
            console.error('Error deleting save after game completion:', deleteError);
        }

        gameState.currentSaveId = null;
    }

    return { success: true };
}

// Calculate final game statistics
function calculateFinalStats() {
    const playerPlanets = gameState.planets.filter(p => p.owner === 'player');

    // Count player ships across all planets and traveling
    const stationedShips = gameState.planets.reduce((sum, p) =>
        sum + p.ships.filter(s => s.owner === 'player').length, 0
    );
    const travelingShips = gameState.travelingShips
        .filter(g => g.owner === 'player')
        .reduce((sum, g) => sum + g.ships.length, 0);

    return {
        planetsOwned: playerPlanets.length,
        shipsBuilt: gameState.players.player.shipsBuilt || (stationedShips + travelingShips),
        enemyShipsDestroyed: gameState.players.player.enemyShipsDestroyed || 0
    };
}

// Check if current game has a save
export function hasActiveSave() {
    return gameState.currentSaveId !== null;
}

// Clear current save reference (for new game)
export function clearCurrentSave() {
    gameState.currentSaveId = null;
}
