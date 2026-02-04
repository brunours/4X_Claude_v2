// ============================================
// AUTHENTICATION MODULE
// ============================================
// Version: 2.0.10
//
// This module handles all user authentication operations including
// sign up, sign in, sign out, password reset, and profile management.
// Includes fallback handling when user is authenticated but profile is missing.
//
// Exports:
// - getCurrentUser() - Returns current session user or null
// - signUp(email, password, username) - Register new user
// - signIn(email, password) - Login existing user
// - signOut() - Logout current user
// - requestPasswordReset(email) - Send password reset email
// - updatePassword(newPassword) - Update password after reset
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
                preferred_influence_transparency: 0.10,
                preferred_planet_names: 'greek'
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
        } else {
            // Profile not found, but user is authenticated
            // Set userId from auth so saves still work
            console.warn('User authenticated but profile not found during sign in.');
            const displayName = data.user.email?.split('@')[0] || 'User';
            setUserInfo(data.user.id, displayName);
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

// Request password reset email
// Supabase sends an email with a link that redirects back to the app
export async function requestPasswordReset(email) {
    // Get the current URL as the redirect destination
    const redirectTo = window.location.origin + window.location.pathname;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
    });

    if (error) {
        console.error('Error requesting password reset:', error);
        return { success: false, error };
    }

    return { success: true, error: null };
}

// Update password after reset (called when user clicks email link)
// This should be called after the PASSWORD_RECOVERY event is detected
export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        console.error('Error updating password:', error);
        return { success: false, error };
    }

    return { success: true, error: null };
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
        console.error('Profile fetch failed for user:', user.id);
        console.error('Error details:', JSON.stringify(error, null, 2));
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
    if (preferences.planetNames !== undefined) updateData.preferred_planet_names = preferences.planetNames;

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
    gameState.planetNameTheme = profile.preferred_planet_names || 'greek';
}

// Save current game settings to profile
export async function saveSettingsToProfile() {
    return updateProfile({
        playerColor: gameState.playerColor,
        aiColor: gameState.aiColor,
        mapSize: gameState.mapSize,
        difficulty: gameState.difficulty,
        influenceTransparency: gameState.influenceTransparency,
        planetNames: gameState.planetNameTheme
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
                // Profile found - use nickname for display
                setUserInfo(session.user.id, profile.nickname || profile.username);
                applyProfileToGameState(profile);
                return { authenticated: true, profile };
            } else {
                // Profile not found, but user is authenticated
                // Set userId from session so saves still work
                console.warn('User authenticated but profile not found. Using email for display.');
                const displayName = session.user.email?.split('@')[0] || 'User';
                setUserInfo(session.user.id, displayName);
                // Game will use default settings since no profile
                return { authenticated: true, profile: null };
            }
        }
        return { authenticated: false, profile: null };
    } catch (error) {
        console.error('Error initializing auth:', error);
        return { authenticated: false, profile: null };
    }
}

// Subscribe to auth state changes
// Returns unsubscribe function
export function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
    return () => subscription.unsubscribe();
}
