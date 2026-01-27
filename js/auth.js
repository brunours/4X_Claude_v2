// ============================================
// AUTHENTICATION MODULE
// ============================================
//
// This module handles all user authentication operations including
// sign up, sign in, sign out, and profile management.
//
// Exports:
// - getCurrentUser() - Returns current session user or null
// - signUp(email, password, username) - Register new user
// - signIn(email, password) - Login existing user
// - signOut() - Logout current user
// - getProfile() - Fetch user profile from database
// - updateProfile(preferences) - Update user preferences
// - onAuthStateChange(callback) - Subscribe to auth state changes

import { supabase } from './supabaseClient.js';
import { gameState, setUserInfo, clearUserInfo } from './gameState.js';

// Get current authenticated user
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting current user:', error);
        return null;
    }
    return user;
}

// Get current session
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error);
        return null;
    }
    return session;
}

// Sign up a new user with email and password
// nickname is optional - defaults to username if not provided
export async function signUp(email, password, username, nickname = null) {
    // First check if username is already taken
    const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

    if (existingUser) {
        return { user: null, error: { message: 'Username is already taken' } };
    }

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        return { user: null, error };
    }

    if (data.user) {
        // Create profile for the new user
        // Use nickname if provided, otherwise default to username
        const displayName = nickname || username;
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                username: username,
                nickname: displayName,
                preferred_player_color: 'blue',
                preferred_ai_color: 'red',
                preferred_map_size: 'compact',
                preferred_difficulty: 'easy',
                preferred_influence_transparency: 0.10
            });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            return { user: data.user, error: profileError };
        }

        // Set user info in game state (use nickname for display)
        setUserInfo(data.user.id, displayName);
    }

    return { user: data.user, error: null };
}

// Sign in existing user
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return { user: null, error };
    }

    if (data.user) {
        // Load profile and set user info (use nickname for display)
        const profile = await getProfile();
        if (profile) {
            setUserInfo(data.user.id, profile.nickname || profile.username);
        }
    }

    return { user: data.user, error: null };
}

// Sign out current user
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
        return false;
    }
    clearUserInfo();
    return true;
}

// Get user profile from database
export async function getProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}

// Update user profile preferences
export async function updateProfile(preferences) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const updateData = {};
    if (preferences.nickname !== undefined) updateData.nickname = preferences.nickname;
    if (preferences.playerColor !== undefined) updateData.preferred_player_color = preferences.playerColor;
    if (preferences.aiColor !== undefined) updateData.preferred_ai_color = preferences.aiColor;
    if (preferences.mapSize !== undefined) updateData.preferred_map_size = preferences.mapSize;
    if (preferences.difficulty !== undefined) updateData.preferred_difficulty = preferences.difficulty;
    if (preferences.influenceTransparency !== undefined) updateData.preferred_influence_transparency = preferences.influenceTransparency;

    const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error };
    }

    return { success: true, error: null };
}

// Apply profile preferences to game state
export function applyProfileToGameState(profile) {
    if (!profile) return;

    gameState.playerColor = profile.preferred_player_color || 'blue';
    gameState.aiColor = profile.preferred_ai_color || 'red';
    gameState.mapSize = profile.preferred_map_size || 'compact';
    gameState.difficulty = profile.preferred_difficulty || 'easy';
    gameState.influenceTransparency = profile.preferred_influence_transparency || 0.10;
}

// Save current game settings to profile
export async function saveSettingsToProfile() {
    return updateProfile({
        playerColor: gameState.playerColor,
        aiColor: gameState.aiColor,
        mapSize: gameState.mapSize,
        difficulty: gameState.difficulty,
        influenceTransparency: gameState.influenceTransparency
    });
}

// Subscribe to auth state changes
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// Check if user is authenticated
export async function isAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}

// Initialize auth state on page load
export async function initAuth() {
    try {
        const session = await getSession();
        if (session?.user) {
            const profile = await getProfile();
            if (profile) {
                setUserInfo(session.user.id, profile.nickname || profile.username);
                applyProfileToGameState(profile);
                return { authenticated: true, profile };
            }
        }
        return { authenticated: false, profile: null };
    } catch (error) {
        console.error('Error initializing auth:', error);
        return { authenticated: false, profile: null };
    }
}
