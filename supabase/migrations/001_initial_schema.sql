-- ============================================
-- 4X SPACE CONQUEST - SUPABASE DATABASE SCHEMA
-- ============================================
-- Run this migration in Supabase SQL Editor to create the required tables
-- Project: 4X_Space_v2_SB (oexqnrucwmfvkhjcvnnf)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: profiles
-- ============================================
-- Stores user preferences and display information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    nickname TEXT, -- Display name (separate from username for flexibility)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- User preferences
    preferred_player_color TEXT DEFAULT 'blue',
    preferred_ai_color TEXT DEFAULT 'red',
    preferred_map_size TEXT DEFAULT 'compact',
    preferred_difficulty TEXT DEFAULT 'easy',
    preferred_influence_transparency NUMERIC DEFAULT 0.10,
    preferred_planet_names TEXT DEFAULT 'greek'
);

-- ============================================
-- TABLE: saved_games
-- ============================================
-- Stores in-progress game saves (auto-saved after each turn)
CREATE TABLE IF NOT EXISTS saved_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    map_seed TEXT NOT NULL,
    map_size TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    player_color TEXT NOT NULL,
    ai_color TEXT NOT NULL,
    current_turn INTEGER NOT NULL,
    player_score INTEGER NOT NULL,
    player_planets INTEGER NOT NULL,
    enemy_planets INTEGER NOT NULL,
    game_state JSONB NOT NULL
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_saved_games_user_id ON saved_games(user_id);

-- ============================================
-- TABLE: completed_games
-- ============================================
-- Stores finished games for leaderboard (victories only)
CREATE TABLE IF NOT EXISTS completed_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL, -- Denormalized for leaderboard display
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    map_seed TEXT NOT NULL,
    map_size TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    player_color TEXT NOT NULL,
    ai_color TEXT NOT NULL,
    influence_transparency NUMERIC NOT NULL DEFAULT 0.10,
    final_score INTEGER NOT NULL,
    final_turn INTEGER NOT NULL,
    victory BOOLEAN NOT NULL,
    planets_owned INTEGER NOT NULL,
    ships_built INTEGER NOT NULL,
    enemy_ships_destroyed INTEGER NOT NULL,
    final_map_state JSONB NOT NULL
);

-- Create indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_completed_games_user_id ON completed_games(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_games_final_score ON completed_games(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_completed_games_victory ON completed_games(victory);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_games ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Saved Games: Users can CRUD their own saves
CREATE POLICY "Users can read own saves"
    ON saved_games FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saves"
    ON saved_games FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saves"
    ON saved_games FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saves"
    ON saved_games FOR DELETE
    USING (auth.uid() = user_id);

-- Completed Games: All authenticated users can read (for global leaderboard)
-- Users can only insert their own games
CREATE POLICY "Authenticated users can read all completed games"
    ON completed_games FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert own completed games"
    ON completed_games FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function: Get personal leaderboard (user's top 10 victories)
CREATE OR REPLACE FUNCTION get_personal_leaderboard(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    username TEXT,
    completed_at TIMESTAMPTZ,
    map_seed TEXT,
    map_size TEXT,
    difficulty TEXT,
    player_color TEXT,
    ai_color TEXT,
    final_score INTEGER,
    final_turn INTEGER,
    planets_owned INTEGER,
    ships_built INTEGER,
    enemy_ships_destroyed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cg.id,
        cg.username,
        cg.completed_at,
        cg.map_seed,
        cg.map_size,
        cg.difficulty,
        cg.player_color,
        cg.ai_color,
        cg.final_score,
        cg.final_turn,
        cg.planets_owned,
        cg.ships_built,
        cg.enemy_ships_destroyed
    FROM completed_games cg
    WHERE cg.user_id = p_user_id
        AND cg.victory = true
    ORDER BY cg.final_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get global leaderboard (top 10 victories across all users)
CREATE OR REPLACE FUNCTION get_global_leaderboard()
RETURNS TABLE (
    id UUID,
    username TEXT,
    completed_at TIMESTAMPTZ,
    map_seed TEXT,
    map_size TEXT,
    difficulty TEXT,
    player_color TEXT,
    ai_color TEXT,
    final_score INTEGER,
    final_turn INTEGER,
    planets_owned INTEGER,
    ships_built INTEGER,
    enemy_ships_destroyed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cg.id,
        cg.username,
        cg.completed_at,
        cg.map_seed,
        cg.map_size,
        cg.difficulty,
        cg.player_color,
        cg.ai_color,
        cg.final_score,
        cg.final_turn,
        cg.planets_owned,
        cg.ships_built,
        cg.enemy_ships_destroyed
    FROM completed_games cg
    WHERE cg.victory = true
    ORDER BY cg.final_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_personal_leaderboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_leaderboard() TO authenticated;
