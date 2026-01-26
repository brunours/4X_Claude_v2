// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================
//
// This module initializes and exports the Supabase client instance
// for use throughout the application.
//
// Exports:
// - supabase: The configured Supabase client instance

// Import Supabase from CDN - use default export
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://oexqnrucwmfvkhjcvnnf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leHFucnVjd21mdmtoamN2bm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTU1NTEsImV4cCI6MjA4NDkzMTU1MX0.16j2laipPmJ2Cw4_XHrUcPdNvzS_yVr0YS5BJRCIhZ8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
